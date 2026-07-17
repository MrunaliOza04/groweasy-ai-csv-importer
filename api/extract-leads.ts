import type { VercelRequest, VercelResponse } from "@vercel/node";
import { extractLeadsInBatches } from "../services/ai.service";

// Vercel treats any file under /api as a serverless function, automatically
// mapped to /api/<filename> — no vercel.json required for this route.
// This mirrors the POST /api/extract-leads handler in server.ts exactly,
// so production behaves identically to local `npm run dev`.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS (safe to keep even though frontend + API share the same domain on Vercel)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { records } = req.body ?? {};
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

    const results = await extractLeadsInBatches(records);
    return res.status(200).json(results);
  } catch (error) {
    console.error("Error in /api/extract-leads:", error);
    return res.status(500).json({
      error: "Failed to parse and map leads. Please check your CSV contents.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
