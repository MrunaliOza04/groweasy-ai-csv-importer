# AI-Powered CSV Importer — GrowEasy CRM Ingress Engine

An intelligent bulk lead ingestion portal that leverages Large Language Models (Gemini API) to accurately map, parse, and normalize diverse or messy spreadsheet records into a strict, unified CRM database schema.

---

## 🚀 Key Features

- **Messy Columns to CRM Alignment**: Upload sheets from Facebook, Google Ads, or custom agencies. The LLM automatically maps fields like `First Name`, `Contact No`, `Emails`, `Creation Time` to proper CRM targets.
- **Client-Side Preview**: Utilizes `PapaParse` to stream and preview raw uploaded spreadsheets locally inside a highly responsive virtualized table (`react-window`) prior to server ingest.
- **LLM Batch Processing**: Sends processed records to the Gemini API in cycles of 25 to optimize context windows and prevent payload size errors.
- **Strict Data Integrity Filters**:
  - **Status Normalization**: Limits output status to `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, or `SALE_DONE`.
  - **Source Identification**: Restricts data sources to standard categories (`leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`).
  - **Contact Validation**: Automatically discards records lacking **both** an email address and a mobile number.
  - **Duplicate / Multi-Contact Storage**: Parses the first contact into primary fields, appending additional emails/phones to `crm_note`.
  - **Date Normalization**: Guarantees that lead timestamps are successfully convertible via JavaScript's `new Date()`.
- **SaaS Workspace UI**: Fully optimized dark mode aesthetic featuring a bento-grid stats panel, instant template downloads, retry buttons for network resiliency, and status filtering.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite SPA), Tailwind CSS, Framer Motion, PapaParse, Axios, react-window.
- **Backend**: Node.js, Express, CORS, Multer, `@google/genai` TypeScript SDK.
- **Testing**: Jest unit tests.

---

## 📋 Installation & Setup

Follow these exact steps to run the application locally on your computer.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (v9 or higher recommended)

### 1. Install Dependencies

In the root directory of this project, execute:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root of the project by copying the example environment file:

```bash
cp .env.example .env
```

Open the newly created `.env` file and insert your Gemini API Key:

```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
APP_URL="http://localhost:3000"
```

*Note: In the Google AI Studio production or dev sandbox, this API key is automatically injected from secure user secrets.*

---

## 🏃 Running the Application

### Development Mode

To boot up the unified Express backend and Vite frontend development server together on port `3000`, run:

```bash
npm run dev
```

Once the server has initialized, open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

### Production Build

To compile, bundle, and optimize the codebase for a production deployment:

```bash
# Compile client assets and bundle backend via esbuild
npm run build

# Start the compiled production server
npm run start
```

---

## 🧪 Running Unit Tests

The project includes Jest unit tests validating the strict CRM mapping and data validation rules (e.g., dropping invalid leads and appending secondary emails/phones into notes).

To run these tests offline, execute:

```bash
npm run test
```

### Verified Test Cases:
1. **Rule 6 (Discard Invalid Records)**: Records containing neither a primary email nor a mobile phone are dropped.
2. **Rule 5 (Multi-contact Parsing)**: Secondary emails or phone numbers are concatenated and appended into `crm_note`.
3. **Date Verification**: Ensures date outputs can be successfully parsed using JavaScript's `new Date()`.

---

## 📊 CRM Target Fields Schema

The AI maps and sanitizes messy spreadsheet headings to match the following schema:

| Target Field | Description | Type / Constraints |
| :--- | :--- | :--- |
| `created_at` | Lead creation date | Parseable Date (ISO string) |
| `name` | Lead's full name | String |
| `email` | Primary email address | String (Valid Email) |
| `country_code` | Telephone country dial code | String (e.g., `+91`) |
| `mobile_without_country_code` | Primary mobile number | String |
| `company` | Organization/Company Name | String |
| `city` | Location city | String |
| `state` | Location state | String |
| `country` | Location country | String |
| `lead_owner` | Assigned representative | String (Name or Email) |
| `crm_status` | Status | `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE` |
| `crm_note` | Remarks & extra data | String (contains overflow contacts/remarks) |
| `data_source` | Source identifiers | `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots` |
| `possession_time` | Ingress metadata | String |
| `description` | Lead specifications | String |
