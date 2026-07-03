/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  saveOrder,
  getOrder,
  listOrders,
  upsertSession,
  recordEvent,
  recordEvents,
  syncCart,
  markStaleCartsAbandoned,
  getOverview,
  getFunnel,
  getAbandonedCarts,
  getRevenueByLocation,
  getTopProducts,
  getRecentEvents,
} from "./db";

dotenv.config();

const app = express();
const PORT = 3000;

// Behind a proxy/load balancer we still want the real client IP.
app.set("trust proxy", true);
app.use(express.json());

// ---------------------- ANALYTICS HELPERS ----------------------

function getClientIp(req: express.Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

// Lightweight UA sniffing — enough for device/browser/OS breakdowns without a dep.
function parseUserAgent(ua: string): { deviceType: string; browser: string; os: string } {
  const s = ua || "";
  let deviceType = "desktop";
  if (/bot|crawler|spider|crawling/i.test(s)) deviceType = "bot";
  else if (/mobile|iphone|android.*mobile|windows phone/i.test(s)) deviceType = "mobile";
  else if (/ipad|tablet|android(?!.*mobile)/i.test(s)) deviceType = "tablet";

  let browser = "unknown";
  if (/edg\//i.test(s)) browser = "Edge";
  else if (/chrome|crios/i.test(s)) browser = "Chrome";
  else if (/firefox|fxios/i.test(s)) browser = "Firefox";
  else if (/safari/i.test(s)) browser = "Safari";

  let os = "unknown";
  if (/windows/i.test(s)) os = "Windows";
  else if (/mac os|macintosh/i.test(s)) os = "macOS";
  else if (/android/i.test(s)) os = "Android";
  else if (/iphone|ipad|ios/i.test(s)) os = "iOS";
  else if (/linux/i.test(s)) os = "Linux";

  return { deviceType, browser, os };
}

// Lazy-initialize Gemini SDK to protect against module-load crashes if key is omitted
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY is not configured or uses default value. AI Advisor will operate in graceful offline mode.");
    return null;
  }
  
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ---------------------- API ROUTES ----------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// ---------------------- ANALYTICS INGEST ----------------------

// Register / refresh a visitor session (device + location + acquisition channel).
app.post("/api/session", async (req, res) => {
  const b = req.body || {};
  if (!b.id) return res.status(400).json({ error: "Session id is required." });

  const ua = req.headers["user-agent"] || "";
  const { deviceType, browser, os } = parseUserAgent(ua);

  try {
    await upsertSession({
      id: b.id,
      ipAddress: getClientIp(req),
      userAgent: ua,
      deviceType,
      browser,
      os,
      country: b.country ?? null,
      region: b.region ?? null,
      city: b.city ?? null,
      latitude: b.latitude ?? null,
      longitude: b.longitude ?? null,
      timezone: b.timezone ?? null,
      locale: b.locale ?? null,
      referrer: b.referrer ?? null,
      landingPage: b.landingPage ?? null,
      utmSource: b.utmSource ?? null,
      utmMedium: b.utmMedium ?? null,
      utmCampaign: b.utmCampaign ?? null,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to upsert session:", error);
    res.status(500).json({ error: "Could not register session." });
  }
});

// Record one event, or a batch (used by sendBeacon on page exit).
app.post("/api/track", async (req, res) => {
  const b = req.body || {};
  try {
    if (Array.isArray(b.events)) {
      await recordEvents(b.events.map((e: any) => ({ ...e, sessionId: e.sessionId ?? b.sessionId })));
    } else if (b.eventType) {
      await recordEvent(b);
    } else {
      return res.status(400).json({ error: "eventType or events[] is required." });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to record event:", error);
    res.status(500).json({ error: "Could not record event." });
  }
});

// Persist the live cart snapshot so we can measure abandonment vs. conversion.
app.post("/api/cart/sync", async (req, res) => {
  const b = req.body || {};
  if (!b.cartId || !Array.isArray(b.items)) {
    return res.status(400).json({ error: "cartId and items[] are required." });
  }
  try {
    await syncCart(b);
    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to sync cart:", error);
    res.status(500).json({ error: "Could not sync cart." });
  }
});

// Sujood Artisan Advisor AI chat endpoint
app.post("/api/advisor", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  // Format conversational context for Gemini
  // Reconstruct chat history in expected format
  const formattedContents = messages.map((m: any) => {
    return {
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    };
  });

  const client = getGeminiClient();
  
  if (!client) {
    // Elegant fallback simulation if API key is not yet set
    const lastUserMsg = messages[messages.length - 1]?.text?.toLowerCase() || "";
    let reply = "May peace be with you. I am here to help guide your choice of Sujood prayer mats. Since my spiritual digital connection (API key) is not fully bound yet, I can tell you that our orthopedic memory foam mat (Rawdah) offers unparalleled cushion (12mm) for knees, while our Andalusian flat-weave wool mat provides grounded organic warmth. Which aspect of Sujood are you seeking to explore today?";
    
    if (lastUserMsg.includes("knee") || lastUserMsg.includes("pain") || lastUserMsg.includes("foam") || lastUserMsg.includes("ortho")) {
      reply = "For relief of the joints during Sajdah (prostration), I highly recommend our 12mm Rawdah Orthopedic Mat. It utilizes dual-density shock-absorbing foam wrapped in high-grade Pakistani velvet. It cradles the knees, ankles, and forehead with exceptional tactile support, taking pressure off your bones so you can focus entirely on your spiritual devotion.";
    } else if (lastUserMsg.includes("symbol") || lastUserMsg.includes("meaning") || lastUserMsg.includes("design") || lastUserMsg.includes("pattern")) {
      reply = "Our designs celebrate Islamic heritage. The 'Mihrab' arch represents the sacred niche directing your focus to the Kaaba. The infinite geometric patterns (Tessellations) on our Andalusian Loom model represent 'Tawhid'—the infinite Unity of the Creator, with no beginning and no end. Every knot is woven with contemplation.";
    } else if (lastUserMsg.includes("silk") || lastUserMsg.includes("travel") || lastUserMsg.includes("light")) {
      reply = "If you journey often, our Silk Route Travel Mat is featherlight (3mm), folding beautifully into standard luggage. Its mulberry silk-blend weave catches the morning light elegantly, giving you a premium tactile sanctuary wherever your travels lead.";
    }
    
    return res.json({ text: reply });
  }

  try {
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: `You are the senior spiritual artisan and posture wellness specialist for Sujood (sujoodmats.com). 
You speak with absolute grace, humility, and poetic warmth. 
Your purpose is to guide seekers in choosing the ideal prayer mat for their spiritual and physical needs.
- Physical advice: Suggest our Rawdah Orthopedic Mat (12mm dual-density memory foam) for joint, back, or ankle pain. Explain how it absorbs pressure.
- Material advice: Discuss premium organic hand-spun Pakistani wool (Andalusian Flatweave) for thermal grounding, self-cleaning lanolin properties, and classic rustic elegance. Discuss Mulberry silk-blend (Silk Route Mat, 3mm) for travels, featherlight portability, and delicate satin feel.
- Spiritual/Design explanation: Explain that geometric patterns (tessellations) represent 'Tawhid' (Divine Unity, infinity, order in creation) and that the Arch/Mihrab symbolizes the gateway to spiritual focus.
Always respond within 140 words. Maintain pristine, high-class language. Avoid dry corporate jargon. Never use emojis.`,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || "I contemplate your words, but cannot formulate a response. Please let me try again." });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "The advisor is currently in contemplation. Please try again soon." });
  }
});

// Mock checkout endpoint — persists an enriched order and closes out the cart.
app.post("/api/checkout", async (req, res) => {
  const { cartItems, customerInfo, sessionId, cartId } = req.body;
  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: "Cart is empty." });
  }
  if (!customerInfo || !customerInfo.email || !customerInfo.name) {
    return res.status(400).json({ error: "Missing customer details." });
  }

  const orderId = `SUJOOD-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const subtotal = cartItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  // Mirror the frontend's companion-bundle discount so persisted money reconciles.
  const discount = cartItems.length > 1 ? 25 : 0;
  const total = Math.max(0, subtotal - discount);
  const estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  try {
    await saveOrder({
      orderId,
      sessionId: sessionId ?? null,
      cartId: cartId ?? null,
      ipAddress: getClientIp(req),
      customerInfo,
      cartItems,
      subtotal,
      discount,
      total,
      estimatedDelivery,
    });
  } catch (error) {
    console.error("Failed to persist order:", error);
    // Capture the failed attempt so lost sales are visible in analytics.
    try {
      await recordEvent({ sessionId, eventType: "purchase_failed", value: total, cartId, metadata: { orderId } });
    } catch { /* best-effort */ }
    return res.status(500).json({ error: "We could not register your order in the loom workshop. Please try again." });
  }

  res.json({
    success: true,
    orderId,
    total,
    estimatedDelivery,
    message: `Thanks, ${customerInfo.name}. Your order has been received. We'll prepare and pack it, then email you tracking updates.`
  });
});

// Retrieve a single persisted order (with its line items)
app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json(order);
  } catch (error) {
    console.error("Failed to fetch order:", error);
    res.status(500).json({ error: "Could not fetch order." });
  }
});

// List recent orders
app.get("/api/orders", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json(await listOrders(limit));
  } catch (error) {
    console.error("Failed to list orders:", error);
    res.status(500).json({ error: "Could not list orders." });
  }
});

// ---------------------- ANALYTICS / BUSINESS INTELLIGENCE ----------------------

// Headline dashboard: traffic, revenue, conversion, abandonment.
app.get("/api/analytics/overview", async (req, res) => {
  try {
    await markStaleCartsAbandoned(Number(req.query.staleMinutes) || 30);
    res.json(await getOverview());
  } catch (error) {
    console.error("analytics/overview failed:", error);
    res.status(500).json({ error: "Could not load overview." });
  }
});

// Visitor -> product view -> add to cart -> checkout -> purchase.
app.get("/api/analytics/funnel", async (req, res) => {
  try {
    res.json(await getFunnel());
  } catch (error) {
    console.error("analytics/funnel failed:", error);
    res.status(500).json({ error: "Could not load funnel." });
  }
});

// Carts left behind, with contents and visitor location.
app.get("/api/analytics/abandoned-carts", async (req, res) => {
  try {
    await markStaleCartsAbandoned(Number(req.query.staleMinutes) || 30);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json(await getAbandonedCarts(limit));
  } catch (error) {
    console.error("analytics/abandoned-carts failed:", error);
    res.status(500).json({ error: "Could not load abandoned carts." });
  }
});

// Revenue grouped by customer country.
app.get("/api/analytics/by-location", async (req, res) => {
  try {
    res.json(await getRevenueByLocation());
  } catch (error) {
    console.error("analytics/by-location failed:", error);
    res.status(500).json({ error: "Could not load revenue by location." });
  }
});

// Product interest vs. sales (find demand the catalog isn't converting).
app.get("/api/analytics/top-products", async (req, res) => {
  try {
    res.json(await getTopProducts());
  } catch (error) {
    console.error("analytics/top-products failed:", error);
    res.status(500).json({ error: "Could not load top products." });
  }
});

// Raw recent activity feed.
app.get("/api/analytics/events", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json(await getRecentEvents(limit));
  } catch (error) {
    console.error("analytics/events failed:", error);
    res.status(500).json({ error: "Could not load events." });
  }
});

// ---------------------- VITE INTERPRETER MIDDLEWARE ----------------------

async function start() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite HMR wrapper...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static bundle...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sujood Server running harmoniously on http://0.0.0.0:${PORT}`);
  });
}

start();
