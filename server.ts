import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing middleware
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/insights", async (req, res) => {
    try {
      const { stats, totalRecords, projectName } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are a professional Project Document Control Manager and data analyst.
      Analyze the following document control statistics for the project "${projectName || 'Unknown Project'}":
      Total Records Processed: ${totalRecords}
      Stats summary:
      ${JSON.stringify(stats, null, 2)}
      
      Please provide a concise, executive-level summary of the insights, focusing on:
      1. Overall Performance & Approval Rates
      2. Delay Predictions & Bottlenecks
      3. Actionable Recommendations for the Engineering Team.
      
      Format your response with proper Markdown (use bold text, bullet points). Keep it professional and direct without fluffy introductions.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      res.json({ insights: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate insights." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
