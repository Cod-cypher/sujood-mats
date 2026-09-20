/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import express from "express";
import compression from "compression";
import cors from "cors";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
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
import { SEO_PAGES, HOME_UPDATED, findSeoPage, renderSeoPage } from "./src/seo/registry";
import { renderNotFound } from "./src/seo/layout";
import { renderSitemap } from "./src/seo/sitemap";
import { renderLlmsTxt } from "./src/seo/llms";
import { PRODUCTS } from "./src/data";
import { sendOrderEmails } from "./mailer";

dotenv.config();

const app = express();
// Port is configurable via the PORT env var (defaults to 3000). Set it in .env
// if 3000 is already taken on the host — remember to match it in the Caddyfile.
const PORT = Number(process.env.PORT) || 3000;

// Behind a proxy/load balancer (Caddy) we still want the real client IP.
app.set("trust proxy", true);

// Gzip HTML, CSS, JS and JSON (images are already compressed and are skipped).
app.use(compression());

// CORS: the frontend (GitHub Pages) is a different origin from this API.
// Set CORS_ORIGIN to a comma-separated allowlist, e.g.
//   CORS_ORIGIN="https://sujoodmats.com,https://www.sujoodmats.com"
// If unset, all origins are allowed (fine for local dev).
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  })
);

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

// ---------------------- CHECKOUT ----------------------
// Orders are invoice-based: nothing is charged here. The order is saved as unpaid, the
// customer is told it is not confirmed until the invoice (sent by hand) is paid, and
// sales is notified that an invoice is needed.

// Checkout emails an address the visitor types in, so cap it per IP to stop it being
// used to flood someone else's inbox.
const CHECKOUT_LIMIT = 5;
const CHECKOUT_WINDOW_MS = 60 * 60 * 1000;
const checkoutHits = new Map<string, number[]>();
function checkoutAllowed(ip: string): boolean {
  const now = Date.now();
  const recent = (checkoutHits.get(ip) ?? []).filter((t) => now - t < CHECKOUT_WINDOW_MS);
  if (recent.length >= CHECKOUT_LIMIT) {
    checkoutHits.set(ip, recent);
    return false;
  }
  recent.push(now);
  checkoutHits.set(ip, recent);
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_QUANTITY = 20;
const cleanField = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").trim().slice(0, max) : "";

app.post("/api/checkout", async (req, res) => {
  const { cartItems, customerInfo, sessionId, cartId } = req.body ?? {};
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: "Your cart is empty." });
  }
  if (cartItems.length > 20) {
    return res.status(400).json({ error: "Too many items in one order. Please contact us for bulk orders." });
  }

  const customer = {
    name: cleanField(customerInfo?.name, 120),
    email: cleanField(customerInfo?.email, 254).toLowerCase(),
    address: cleanField(customerInfo?.address, 200),
    city: cleanField(customerInfo?.city, 120),
    postalCode: cleanField(customerInfo?.postalCode, 20),
    country: cleanField(customerInfo?.country, 80),
  };
  if (!customer.name || !customer.address || !customer.city || !customer.postalCode || !customer.country) {
    return res.status(400).json({ error: "Please fill in your full shipping address." });
  }
  if (!EMAIL_RE.test(customer.email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  // Price the order from our own catalogue: never trust names or prices from the browser.
  const lineItems = [];
  for (const item of cartItems) {
    const product = PRODUCTS.find((p) => p.id === item?.productId);
    const colorway = product?.colorways.find((c) => c.name === item?.colorway);
    const quantity = Number(item?.quantity);
    if (!product || !colorway || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return res.status(400).json({ error: "Something in your cart is no longer available. Please refresh and try again." });
    }
    lineItems.push({
      productId: product.id,
      name: product.name,
      colorway: colorway.name,
      price: product.price,
      quantity,
      imageUrl: colorway.imageUrl ?? product.imageUrl,
    });
  }

  const ipAddress = getClientIp(req);
  if (!checkoutAllowed(ipAddress)) {
    return res.status(429).json({ error: "Too many orders from this connection. Please try again later or email us." });
  }

  const orderId = `SUJOOD-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;
  const subtotal = lineItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  // Mirror the frontend's companion-bundle discount so persisted money reconciles.
  const discount = lineItems.length > 1 ? 25 : 0;
  const total = Math.max(0, subtotal - discount);

  try {
    await saveOrder({
      orderId,
      sessionId: sessionId ?? null,
      cartId: cartId ?? null,
      ipAddress,
      customerInfo: { ...customer, timezone: cleanField(customerInfo?.timezone, 64) || undefined },
      cartItems: lineItems,
      subtotal,
      discount,
      total,
    });
  } catch (error) {
    console.error("Failed to persist order:", error);
    // Capture the failed attempt so lost sales are visible in analytics.
    try {
      await recordEvent({ sessionId, eventType: "purchase_failed", value: total, cartId, metadata: { orderId } });
    } catch { /* best-effort */ }
    return res.status(500).json({ error: "We could not save your order. Please try again." });
  }

  // The order is saved either way; the response says whether the customer email went out.
  const sent = await sendOrderEmails({
    orderId,
    placedAt: new Date(),
    customer,
    items: lineItems,
    subtotal,
    discount,
    total,
    ipAddress,
  });

  res.json({ success: true, orderId, total, email: customer.email, emailSent: sent.customer });
});

// ---------------------- ADMIN-ONLY READ ENDPOINTS ----------------------
// Orders and analytics contain customer names, emails and addresses. They answer only to
// "Authorization: Bearer <ADMIN_TOKEN>", and do not exist at all while ADMIN_TOKEN is unset.
app.use(["/api/orders", "/api/analytics"], (req, res, next) => {
  const token = process.env.ADMIN_TOKEN ?? "";
  const given = Buffer.from((req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(token);
  if (!token || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  next();
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

// ---------------------- SERVER-RENDERED SEO PAGES ----------------------

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml").set("Cache-Control", "public, max-age=3600");
  res.send(renderSitemap(SEO_PAGES, HOME_UPDATED));
});

app.get("/llms.txt", (req, res) => {
  res.type("text/plain; charset=utf-8").set("Cache-Control", "public, max-age=3600");
  res.send(renderLlmsTxt(SEO_PAGES));
});

app.get("*", (req, res, next) => {
  const page = findSeoPage(req.path);
  if (page) {
    res.set("Cache-Control", "public, max-age=300").type("html").send(renderSeoPage(page));
    return;
  }
  // /wool-prayer-mats -> /wool-prayer-mats/ (canonical form), keeping any query string.
  if (!req.path.endsWith("/") && findSeoPage(req.path + "/")) {
    const query = req.originalUrl.slice(req.path.length);
    res.redirect(301, req.path + "/" + query);
    return;
  }
  next();
});

function sendNotFound(req: express.Request, res: express.Response) {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  res.status(404).type("html").send(renderNotFound());
}

// ---------------------- VITE INTERPRETER MIDDLEWARE ----------------------

async function start() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite HMR wrapper...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    // Homepage: SSR the React app on every request so edits show up immediately.
    app.get("/", async (req, res, next) => {
      try {
        const template = await vite.transformIndexHtml(
          req.originalUrl,
          fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8")
        );
        const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
        res.type("html").send(template.replace("<!--app-html-->", render()));
      } catch (error) {
        vite.ssrFixStacktrace(error as Error);
        next(error);
      }
    });
  } else {
    console.log("Starting server in production mode serving static bundle...");
    const clientPath = path.join(process.cwd(), "dist", "client");
    const template = fs.readFileSync(path.join(clientPath, "index.html"), "utf-8");
    // Plain require so esbuild leaves this runtime path alone (bundle is built by vite --ssr).
    const requireFromRoot = createRequire(path.join(process.cwd(), "package.json"));
    const { render } = requireFromRoot(path.join(process.cwd(), "dist", "ssr", "entry-server.cjs"));
    // The homepage has no per-request data, so render it once at startup.
    const homeHtml = template.replace("<!--app-html-->", render());

    app.use(
      express.static(clientPath, {
        index: false,
        setHeaders(res, filePath) {
          const rel = path.relative(clientPath, filePath).replace(/\\/g, "/");
          // Vite fingerprints everything in /assets/, so it can be cached forever.
          if (rel.startsWith("assets/")) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          else if (rel.startsWith("images/") || rel.startsWith("fonts/")) res.setHeader("Cache-Control", "public, max-age=2592000");
        },
      })
    );
    app.get("/", (req, res) => {
      res.set("Cache-Control", "public, max-age=300").type("html").send(homeHtml);
    });
  }

  app.use(sendNotFound);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sujood Server running harmoniously on http://0.0.0.0:${PORT}`);
  });
}

start();
