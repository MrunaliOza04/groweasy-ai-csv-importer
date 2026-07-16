import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CsvUploaderProps {
  onFileParsed: (data: any[], fileName: string) => void;
  onClear: () => void;
}

export default function CsvUploader({
  onFileParsed,
  onClear,
}: CsvUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a valid CSV (.csv) file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds the 5MB size limit.");
      return;
    }

    setError(null);
    setSelectedFile({ name: file.name, size: file.size });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.warn("PapaParse warnings during parsing:", results.errors);
        }
        if (!results.data || results.data.length === 0) {
          setError("The uploaded CSV file contains no records.");
          onClear();
          setSelectedFile(null);
          return;
        }
        onFileParsed(results.data, file.name);
      },
      error: (err) => {
        setError(`Failed to parse CSV file: ${err.message}`);
        onClear();
        setSelectedFile(null);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    onClear();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".csv"
        onChange={handleChange}
        id="csv-file-input"
      />

      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            id="drag-drop-zone"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl py-12 px-6 text-center cursor-pointer transition-all duration-300 backdrop-blur-md ${
              dragActive
                ? "border-cyan-500 bg-cyan-950/15 shadow-lg shadow-cyan-500/5"
                : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/10"
            }`}
          >
            <div className="p-4 bg-slate-900/60 rounded-full border border-slate-800/80 mb-4 text-cyan-400 transition-transform">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-base font-semibold text-slate-200">
              Drop your CSV file here
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              or{" "}
              <span className="text-cyan-400 font-medium hover:underline">
                click to browse
              </span>{" "}
              files from your device
            </p>

            <div className="mt-6 flex flex-col items-center gap-1.5 border-t border-slate-900 pt-6 w-full max-w-md">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Guidelines
              </span>
              <p className="text-[11px] text-slate-400">
                Supported format:{" "}
                <code className="text-slate-300 font-mono">.csv</code> (Max size:
                5MB)
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs text-center mt-1">
                Any column headers are supported. Our AI mapper intelligently
                processes and organizes the fields.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            id="uploaded-file-card"
            className="border border-slate-800 rounded-2xl p-5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {selectedFile.name}
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {formatBytes(selectedFile.size)}
                </p>
              </div>
            </div>

            <button
              id="clear-file-btn"
              type="button"
              onClick={clearFile}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer"
              title="Remove File"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          id="upload-error-banner"
          className="mt-4 flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 text-left animate-pulse"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Upload Error</p>
            <p className="mt-0.5 opacity-90">{error}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
