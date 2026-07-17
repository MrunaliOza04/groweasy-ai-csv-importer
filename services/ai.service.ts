import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

// Lazy initialize the Gemini Client to avoid crashing if API key is missing
let aiClient: GoogleGenAI | null = null;

export function setAiClient(client: any) {
  aiClient = client;
}

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
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

export interface CRMLead {
  created_at?: string;
  name?: string;
  email?: string;
  country_code?: string;
  mobile_without_country_code?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  lead_owner?: string;
  crm_status?: "GOOD_LEAD_FOLLOW_UP" | "DID_NOT_CONNECT" | "BAD_LEAD" | "SALE_DONE" | "";
  crm_note?: string;
  data_source?: "leads_on_demand" | "meridian_tower" | "eden_park" | "varah_swamy" | "sarjapur_plots" | "";
  possession_time?: string;
  description?: string;
}

/**
 * Maps messy raw records to the GrowEasy CRM schema in batches to prevent context limits.
 */
export async function extractLeadsInBatches(
  rawRecords: any[],
  batchSize = 25
): Promise<{
  parsedRecords: CRMLead[];
  skippedRecords: any[];
  totalImported: number;
  totalSkipped: number;
}> {
  const parsedRecords: CRMLead[] = [];
  const skippedRecords: any[] = [];

  for (let i = 0; i < rawRecords.length; i += batchSize) {
    const batch = rawRecords.slice(i, i + batchSize);
    await processBatchWithFallback(batch, i, parsedRecords, skippedRecords);
  }

  return {
    parsedRecords,
    skippedRecords,
    totalImported: parsedRecords.length,
    totalSkipped: skippedRecords.length,
  };
}

/**
 * Attempts a batch; if it fails (timeout, truncation, bad JSON), retries once
 * by splitting the batch in half instead of failing the whole import.
 * If a batch of size 1 still fails, those records are recorded as skipped
 * with the reason, rather than hanging or crashing the request.
 */
async function processBatchWithFallback(
  batch: any[],
  startIndex: number,
  parsedRecords: CRMLead[],
  skippedRecords: any[]
): Promise<void> {
  try {
    const mappedBatch = await extractLeadsBatch(batch);
    applyMappedBatch(mappedBatch, batch, parsedRecords, skippedRecords);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Batch at index ${startIndex} failed (${message}).`);

    if (batch.length === 1) {
      skippedRecords.push({
        record: batch[0],
        reason: `Batch extraction failed: ${message}`,
      });
      return;
    }

    // Split and retry — a smaller batch is far less likely to hit output-token limits.
    console.error(`Retrying as two smaller batches...`);
    const mid = Math.ceil(batch.length / 2);
    await processBatchWithFallback(batch.slice(0, mid), startIndex, parsedRecords, skippedRecords);
    await processBatchWithFallback(batch.slice(mid), startIndex + mid, parsedRecords, skippedRecords);
  }
}

function applyMappedBatch(
  mappedBatch: CRMLead[],
  originalBatch: any[],
  parsedRecords: CRMLead[],
  skippedRecords: any[]
): void {
  for (const record of mappedBatch) {
    // Rule 6: Skip invalid records (lack BOTH an email AND a mobile number)
    const hasEmail = record.email && record.email.trim().length > 0;
    const hasMobile =
      record.mobile_without_country_code &&
      record.mobile_without_country_code.trim().length > 0;

    if (!hasEmail && !hasMobile) {
      skippedRecords.push({
        record,
        reason: "Record lacks both email and mobile number",
      });
      continue;
    }

    // Rule 3: Date format - created_at must be convertible using JavaScript's new Date()
    if (record.created_at) {
      const date = new Date(record.created_at);
      if (isNaN(date.getTime())) {
        // fallback to current date if invalid
        record.created_at = new Date().toISOString();
      } else {
        // Convert to a clean ISO/UTC string or keep it parseable
        record.created_at = date.toISOString();
      }
    } else {
      record.created_at = new Date().toISOString();
    }

    parsedRecords.push(record);
  }
}

/**
 * Sends a single batch to the Gemini API.
 */
async function extractLeadsBatch(batch: any[]): Promise<CRMLead[]> {
  const ai = getAiClient();

  const systemInstruction = `
You are an expert CRM Data Integration Agent. Your task is to intelligently extract and map lead information from raw, messy spreadsheet data into a strict GrowEasy CRM format.
Analyze the input records carefully. Each record is a JSON object with arbitrary columns. You must identify which columns correspond to the target CRM fields.

TARGET FIELDS AND RULES:
1. 'name': The full name of the lead. Intelligently map from fields like 'Full Name', 'Lead Name', 'First Name', 'Last Name', 'Customer', etc.
2. 'email': The primary email. Use the first valid email found. If multiple emails exist in the record, use the first email here, and append the remaining emails into 'crm_note'.
3. 'country_code': E.g., '+91', '+1', '91', etc.
4. 'mobile_without_country_code': The primary mobile number without the country code. If multiple numbers exist, use the first one here, and append any remaining numbers into 'crm_note'.
5. 'company': Company name.
6. 'city', 'state', 'country': Address components.
7. 'lead_owner': Who owns the lead (e.g. an email like test@gmail.com, or a name).
8. 'crm_status': Lead status. MUST ONLY be one of the following exact strings:
   - "GOOD_LEAD_FOLLOW_UP"
   - "DID_NOT_CONNECT"
   - "BAD_LEAD"
   - "SALE_DONE"
   If none match confidently, leave it empty ("").
9. 'data_source': Lead source. MUST ONLY be one of the following exact strings:
   - "leads_on_demand"
   - "meridian_tower"
   - "eden_park"
   - "varah_swamy"
   - "sarjapur_plots"
   If none match confidently, leave it empty ("").
10. 'created_at': Lead creation date. Must be formatted such that it can be successfully parsed in JavaScript via 'new Date(created_at)'.
11. 'crm_note': Use this for:
    - Remarks, follow-up notes, additional comments.
    - Any extra phone numbers or extra email addresses.
    - Any useful information that doesn't fit another field.
12. 'possession_time': Property possession time.
13. 'description': Additional description.

CRITICAL DISCARD RULE (FOR REFERENCE):
If a record lacks BOTH a valid email AND a valid mobile number, the client system will discard it. Try to map as many emails/phones as possible so we don't drop them unnecessarily.

CRITICAL FORMATTING RULE:
Do not introduce unintended line breaks inside fields. If line breaks are necessary in 'crm_note' or 'description', escape them appropriately (using '\\n') so that it remains compatible.
Return the output strictly as a JSON array of objects conforming to the response schema.
`;

  const prompt = `Map the following raw records to the GrowEasy CRM schema according to the system instructions:\n\n${JSON.stringify(
    batch,
    null,
    2
  )}`;

  // Fail fast instead of hanging forever if Gemini stalls on a request.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let response;
  try {
    response = await ai.models.generateContent({
      // gemini-3.1-flash-lite: current GA model, available to new API keys,
      // and not affected by the gemini-3.5-flash structured-output stall.
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        abortSignal: controller.signal,
        systemInstruction,
        // Minimal thinking: this is field-mapping, not multi-step reasoning,
        // and keeps the token budget free for the actual JSON output.
        thinkingConfig: { thinkingLevel: "low" },
        // Generous ceiling so a full batch of verbose records can't be cut off mid-string.
        maxOutputTokens: 32768,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              created_at: {
                type: Type.STRING,
                description:
                  "Lead creation date (ISO string or format parseable by new Date())",
              },
              name: { type: Type.STRING, description: "Lead name" },
              email: { type: Type.STRING, description: "Primary email address" },
              country_code: {
                type: Type.STRING,
                description: "Country code (e.g. +91)",
              },
              mobile_without_country_code: {
                type: Type.STRING,
                description: "Mobile number without country code",
              },
              company: { type: Type.STRING, description: "Company name" },
              city: { type: Type.STRING, description: "City name" },
              state: { type: Type.STRING, description: "State name" },
              country: { type: Type.STRING, description: "Country name" },
              lead_owner: {
                type: Type.STRING,
                description: "Lead owner email or name",
              },
              crm_status: {
                type: Type.STRING,
                description:
                  "Lead status. Must be: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE, or empty",
              },
              crm_note: {
                type: Type.STRING,
                description:
                  "Notes/remarks. Include any extra emails, extra phone numbers, comments, or details here.",
              },
              data_source: {
                type: Type.STRING,
                description:
                  "Source. Must be: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots, or empty",
              },
              possession_time: {
                type: Type.STRING,
                description: "Property possession time description",
              },
              description: {
                type: Type.STRING,
                description: "Additional description of the lead",
              },
            },
            required: [],
          },
        },
      },
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Gemini API request timed out after 60s (no response received).");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    throw new Error("Gemini response was truncated (MAX_TOKENS).");
  }

  const text = response.text;
  if (!text) {
    throw new Error("No response text received from Gemini API");
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as CRMLead[];
    }
    return [];
  } catch (error) {
    console.error("Failed to parse Gemini JSON output:", text);
    throw new Error(
      `Invalid JSON format in AI response: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
