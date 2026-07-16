import { useState } from "react";
import axios from "axios";
import {
  LayoutDashboard,
  UploadCloud,
  FileSpreadsheet,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Download,
  Flame,
  ShieldAlert,
  ListFilter,
  Sparkles,
  BookOpen,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CsvUploader from "./components/CsvUploader";
import DataTable from "./components/DataTable";

// Exact CRM Status definitions per instructions
const CRM_STATUS_LABELS: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "Good Lead Follow Up",
  DID_NOT_CONNECT: "Did Not Connect",
  BAD_LEAD: "Bad Lead",
  SALE_DONE: "Sale Done",
};

// Exact Data Source definitions per instructions
const DATA_SOURCE_LABELS: Record<string, string> = {
  leads_on_demand: "Leads On Demand",
  meridian_tower: "Meridian Tower",
  eden_park: "Eden Park",
  varah_swamy: "Varah Swamy",
  sarjapur_plots: "Sarjapur Plots",
};

interface AIResponse {
  parsedRecords: any[];
  skippedRecords: any[];
  totalImported: number;
  totalSkipped: number;
}

export default function App() {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // AI Response states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<AIResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Result view filter states
  const [resultFilter, setResultFilter] = useState<"all" | "success" | "skipped">("all");

  const handleFileParsed = (data: any[], name: string) => {
    setCsvData(data);
    setFileName(name);
    setActiveStep(2); // Automatically advance to Preview Step
    setResults(null);
    setApiError(null);
  };

  const handleClear = () => {
    setCsvData([]);
    setFileName("");
    setActiveStep(1);
    setResults(null);
    setApiError(null);
  };

  const triggerAiExtraction = async () => {
    setIsLoading(true);
    setApiError(null);
    setActiveStep(3); // Advance to Processing state

    try {
      // POST the parsed CSV records to the server API
      const response = await axios.post<AIResponse>("/api/extract-leads", {
        records: csvData,
      });

      setResults(response.data);
    } catch (err: any) {
      console.error("API error during CRM mapping:", err);
      const errMsg =
        err.response?.data?.details ||
        err.response?.data?.error ||
        err.message ||
        "An unexpected error occurred while communicating with the server.";
      setApiError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleTemplate = () => {
    // Generate a beautiful, messy CRM-compliant sample CSV with edge-cases
    const csvContent =
      "full_name,email_address,contact_number,company_name,city,state,country,source,creation_date,status,notes\n" +
      '"John Doe","john.doe@example.com, backup.john@example.com","+919876543210, +918888888888","GrowEasy","Mumbai","Maharashtra","India","leads_on_demand","2026-05-13 14:20:48","GOOD_LEAD_FOLLOW_UP","Client is asking to reschedule demo"\n' +
      '"Sarah Johnson","sarah.johnson@example.com","+919876543211","Tech Solutions","Bangalore","Karnataka","India","leads_on_demand","2026-05-13 14:25:30","DID_NOT_CONNECT","Person was busy, will try again next week"\n' +
      '"Rajesh Patel","rajesh.patel@example.com","+919876543212","Startup Inc","Delhi","Delhi","India","meridian_tower","2026-05-13 14:30:15","BAD_LEAD","Not interested in our services"\n' +
      '"Priya Singh","priya.singh@example.com","+919876543213","Enterprise Corp","Pune","Maharashtra","India","eden_park","2026-05-13 14:35:22","SALE_DONE","Deal closed, onboarding in progress"\n' +
      '"Invalid Lead Lacking Info","","","No Contact Corp","","","","","","","This record contains neither email nor mobile, so it must be skipped by our system!"\n' +
      '"Multi Contact Test","first@example.com, second@example.com","1234567890, 0987654321","Dual Org","Chennai","Tamil Nadu","India","sarjapur_plots","","GOOD_LEAD_FOLLOW_UP","Let\'s verify that secondary email and phone are appended to notes"';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "groweasy_messy_leads_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSuccessRate = () => {
    if (!results) return 0;
    const total = results.totalImported + results.totalSkipped;
    if (total === 0) return 0;
    return Math.round((results.totalImported / total) * 100);
  };

  // Filter parsed results for display
  const getFilteredResults = () => {
    if (!results) return [];
    if (resultFilter === "success") return results.parsedRecords;
    if (resultFilter === "skipped") {
      return results.skippedRecords.map((item) => ({
        ...item.record,
        skipped_reason: item.reason || "Validation failed",
      }));
    }
    // Combined "all" view
    const successList = results.parsedRecords.map((r) => ({ ...r, import_status: "SUCCESS" }));
    const skippedList = results.skippedRecords.map((s) => ({
      ...s.record,
      import_status: "SKIPPED",
      skipped_reason: s.reason,
    }));
    return [...successList, ...skippedList];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/10 text-white">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              GrowEasy <span className="text-xs bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">AI CRM Hub</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">Bulk Intelligent Data Ingress Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
        
        {/* Workspace Intro & Overview */}
        <div className="flex flex-col gap-2 text-left">
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Lead Sources Importer
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            Upload messy CSV spreadsheets (Facebook export, Google Ads export, or manually compiled tables).
            Our LLM will intelligently analyze the layout, pair ambiguous columns, normalize contacts, and match them with pixel-perfect CRM structures.
          </p>
        </div>

        {/* Step-by-Step Progress Bar */}
        <div id="importer-stepper" className="w-full bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 select-none">
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              activeStep >= 1 ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20" : "bg-slate-900 text-slate-500"
            }`}>
              1
            </div>
            <span className={`text-xs font-semibold transition-colors ${activeStep >= 1 ? "text-slate-200" : "text-slate-600"}`}>
              Upload CSV
            </span>
          </div>

          <div className="hidden md:block h-[1px] flex-1 bg-slate-900 mx-4" />

          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              activeStep >= 2 ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20" : "bg-slate-900 text-slate-500"
            }`}>
              2
            </div>
            <span className={`text-xs font-semibold transition-colors ${activeStep >= 2 ? "text-slate-200" : "text-slate-600"}`}>
              Raw Data Preview
            </span>
          </div>

          <div className="hidden md:block h-[1px] flex-1 bg-slate-900 mx-4" />

          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              activeStep >= 3 ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20" : "bg-slate-900 text-slate-500"
            }`}>
              3
            </div>
            <span className={`text-xs font-semibold transition-colors ${activeStep >= 3 ? "text-slate-200" : "text-slate-600"}`}>
              AI Extraction & Results
            </span>
          </div>
        </div>

        {/* Dynamic Workflow Viewports */}
        <div className="w-full flex flex-col gap-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: UPLOAD WORKSPACE */}
            {activeStep === 1 && (
              <motion.div
                key="step-upload"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Uploader Box */}
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <CsvUploader onFileParsed={handleFileParsed} onClear={handleClear} />
                  </div>

                  {/* CRM Mapping Rules Panel */}
                  <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-6 text-left flex flex-col gap-4 backdrop-blur-md">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        CRM Rules Quick Reference
                      </h3>
                    </div>

                    <div className="flex flex-col gap-3.5 text-xs text-slate-400">
                      <div>
                        <p className="font-semibold text-slate-300 mb-1">🔍 Contact Validation</p>
                        <p>Leads lacking <strong className="text-slate-300">both</strong> email and mobile phone numbers are discarded to keep your database clean.</p>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-300 mb-1">🔗 Multiple Emails & Phones</p>
                        <p>We map the first detected item to the main field, and append any secondary contacts into the <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">crm_note</code>.</p>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-300 mb-1">📅 Automated Dates</p>
                        <p>Dates are automatically parsed and normalized to JavaScript convertible formats.</p>
                      </div>

                      <div className="pt-2 border-t border-slate-900">
                        <p className="font-semibold text-slate-300 mb-1">🏷️ Strict Allowed Statuses</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.keys(CRM_STATUS_LABELS).map((status) => (
                            <span key={status} className="bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded text-[9px] border border-slate-800 font-mono">
                              {status}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        <p className="font-semibold text-slate-300 mb-1">📁 Strict Data Sources</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.keys(DATA_SOURCE_LABELS).map((src) => (
                            <span key={src} className="bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded text-[9px] border border-slate-800 font-mono">
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: PREVIEW WORKSPACE */}
            {activeStep === 2 && (
              <motion.div
                key="step-preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col gap-6"
              >
                {/* File Information Header and Import Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/40 border border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">Raw Spreadsheet Ready</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Parsed <strong className="text-slate-300">{csvData.length} records</strong> locally from <span className="text-slate-300 font-mono">{fileName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      id="reset-import-btn"
                      onClick={handleClear}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear / Change File
                    </button>

                    <button
                      id="confirm-import-btn"
                      onClick={triggerAiExtraction}
                      className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 transition-all cursor-pointer"
                    >
                      Confirm & Run AI Extraction
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Table Preview instructions */}
                <div className="flex items-center justify-between text-left">
                  <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-cyan-500" />
                    Local Parsing Preview (No AI processing yet)
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    Horizontal & Vertical Scroll Enabled with Sticky Header
                  </span>
                </div>

                {/* Local data table */}
                <DataTable data={csvData} maxHeight={450} />
              </motion.div>
            )}

            {/* STEP 3: PROCESSING OR RESULTS WORKSPACE */}
            {activeStep === 3 && (
              <motion.div
                key="step-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                {isLoading ? (
                  /* AI Loader Workspace */
                  <div id="ai-processing-loader" className="flex flex-col items-center justify-center py-24 border border-slate-900 rounded-2xl bg-slate-950/40 backdrop-blur-md gap-6">
                    <div className="relative flex items-center justify-center">
                      {/* Double spinning rings */}
                      <div className="w-16 h-16 border-4 border-t-cyan-500 border-r-cyan-400/30 border-b-cyan-500/10 border-l-cyan-500/40 rounded-full animate-spin" />
                      <div className="absolute w-10 h-10 border-4 border-b-blue-500 border-l-blue-400/20 border-t-blue-500/10 border-r-blue-500/50 rounded-full animate-spin-reverse animate-pulse" />
                      <Cpu className="absolute w-5 h-5 text-cyan-400" />
                    </div>

                    <div className="flex flex-col gap-2 max-w-sm text-center">
                      <h3 className="text-base font-bold text-slate-100 flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                        AI Extraction Active
                      </h3>
                      <p className="text-xs text-slate-400 px-4 leading-relaxed">
                        Analyzing CSV layouts, parsing headers, normalizing contact details, and filtering out invalid entries...
                      </p>
                      
                      {/* Dynamic Batch count indicator */}
                      <div className="mt-4 inline-flex items-center justify-center px-3 py-1 bg-slate-900/80 rounded-full border border-slate-800 text-[10px] font-mono text-cyan-400">
                        Processing in batch cycles (25 rows each)
                      </div>
                    </div>
                  </div>
                ) : apiError ? (
                  /* Error Workspace with Retry capability */
                  <div id="ai-error-workspace" className="flex flex-col items-center justify-center py-16 px-6 border border-rose-500/20 rounded-2xl bg-rose-950/5 text-center gap-6">
                    <div className="p-4 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">
                      <ShieldAlert className="w-8 h-8" />
                    </div>

                    <div className="flex flex-col gap-2 max-w-md">
                      <h3 className="text-base font-bold text-rose-300">AI Import Failed</h3>
                      <p className="text-xs text-rose-300/80 leading-relaxed font-mono bg-slate-950/50 p-4 border border-rose-500/10 rounded-xl select-all">
                        {apiError}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        id="retry-api-btn"
                        onClick={triggerAiExtraction}
                        className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/15 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retry API Call
                      </button>

                      <button
                        id="cancel-error-btn"
                        onClick={() => setActiveStep(2)}
                        className="px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl transition-all cursor-pointer"
                      >
                        Back to Preview
                      </button>
                    </div>
                  </div>
                ) : results ? (
                  /* Final Parsed Results Dashboard */
                  <div id="import-results-dashboard" className="flex flex-col gap-8 animate-fade-in">
                    
                    {/* Action topbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/40 border border-slate-800 rounded-2xl">
                      <div className="flex items-center gap-3 text-left">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-200">Import Parsing Completed</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            AI completed parsing and mapping in standard GrowEasy CRM structure
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          id="new-import-btn"
                          onClick={handleClear}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                          Import Another File
                        </button>
                      </div>
                    </div>

                    {/* Bento-grid Statistics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Total Analyzed */}
                      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 text-left">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">Total Submitted</span>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-2xl font-extrabold text-slate-100">{results.totalImported + results.totalSkipped}</span>
                          <span className="text-xs text-slate-500">records</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Sum of processed rows</p>
                      </div>

                      {/* Successfully Mapped */}
                      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 text-left border-l-2 border-l-emerald-500/60">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 font-mono">Successfully Imported</span>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-2xl font-extrabold text-emerald-400">{results.totalImported}</span>
                          <span className="text-xs text-emerald-500">leads</span>
                        </div>
                        <p className="text-[10px] text-emerald-500 mt-1">Conformed to GrowEasy CRM</p>
                      </div>

                      {/* Skipped / Filtered */}
                      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 text-left border-l-2 border-l-amber-500/60">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 font-mono">Skipped Records</span>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-2xl font-extrabold text-amber-400">{results.totalSkipped}</span>
                          <span className="text-xs text-amber-500">records</span>
                        </div>
                        <p className="text-[10px] text-amber-500 mt-1">Invalid email or mobile info</p>
                      </div>

                      {/* Success Rate */}
                      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 text-left">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-500 font-mono">AI Matching Rate</span>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-2xl font-extrabold text-cyan-400">{getSuccessRate()}%</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Valid CRM records percentage</p>
                      </div>

                    </div>

                    {/* Results Table and Filter Toolbar */}
                    <div className="flex flex-col gap-4">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300">
                            Extracted Lead Records Dashboard
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Filter results below to view successful vs skipped logs.</p>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-900">
                          <button
                            id="filter-all-btn"
                            onClick={() => setResultFilter("all")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              resultFilter === "all" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            All ({results.totalImported + results.totalSkipped})
                          </button>
                          <button
                            id="filter-success-btn"
                            onClick={() => setResultFilter("success")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              resultFilter === "success" ? "bg-slate-900 text-emerald-400" : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Success ({results.totalImported})
                          </button>
                          <button
                            id="filter-skipped-btn"
                            onClick={() => setResultFilter("skipped")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              resultFilter === "skipped" ? "bg-slate-900 text-amber-400" : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            Skipped ({results.totalSkipped})
                          </button>
                        </div>
                      </div>

                      {/* Displaying AI output in the virtualized DataTable */}
                      <DataTable data={getFilteredResults()} maxHeight={450} />

                    </div>

                  </div>
                ) : null}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}
