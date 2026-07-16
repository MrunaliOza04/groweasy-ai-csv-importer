import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { extractLeadsInBatches } from "./services/ai.service";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" })); // Support large JSON payloads from large parsed CSVs

  // API Endpoint: POST /api/extract-leads
  app.post("/api/extract-leads", async (req, res) => {
    try {
      const { records } = req.body;
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({
          error: "Invalid request payload. 'records' must be an array of raw objects.",
        });
      }

      if (records.length === 0) {
        return res.status(200).json({
          parsedRecords: [],
          skippedRecords: [],
          totalImported: 0,
          totalSkipped: 0,
          message: "No records found to process.",
        });
      }

      // Process raw records in batches of 25 (AI service handles details & validation)
      const results = await extractLeadsInBatches(records);
      return res.status(200).json(results);
    } catch (error) {
      console.error("Error in /api/extract-leads:", error);
      return res.status(500).json({
        error: "Failed to parse and map leads. Please check your CSV contents.",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Setup static serving/Vite SPA middlewares
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
