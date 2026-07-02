/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
      reply = "For relief of the joints during Sajdah (prostration), I highly recommend our 12mm Rawdah Orthopedic Mat. It utilizes dual-density shock-absorbing foam wrapped in high-grade Turkish velvet. It cradles the knees, ankles, and forehead with exceptional tactile support, taking pressure off your bones so you can focus entirely on your spiritual devotion.";
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
- Material advice: Discuss premium organic hand-spun Anatolian wool (Andalusian Flatweave) for thermal grounding, self-cleaning lanolin properties, and classic rustic elegance. Discuss Mulberry silk-blend (Silk Route Mat, 3mm) for travels, featherlight portability, and delicate satin feel.
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

// Mock checkout endpoint
app.post("/api/checkout", (req, res) => {
  const { cartItems, customerInfo } = req.body;
  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: "Cart is empty." });
  }
  if (!customerInfo || !customerInfo.email || !customerInfo.name) {
    return res.status(400).json({ error: "Missing customer details." });
  }

  const orderId = `SUJOOD-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const total = cartItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  
  res.json({
    success: true,
    orderId,
    total,
    estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }),
    message: `Peace be upon you, ${customerInfo.name}. Your order has been registered in our loom workshop. We will carefully prepare and pack your sensory prayer sanctuary.`
  });
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
