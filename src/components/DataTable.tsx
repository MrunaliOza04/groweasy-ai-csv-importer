import React, { useMemo } from "react";
import { List } from "react-window";

interface DataTableProps {
  data: any[];
  maxHeight?: number;
  rowHeight?: number;
}

export default function DataTable({
  data,
  maxHeight = 400,
  rowHeight = 44,
}: DataTableProps) {
  // Dynamic extraction of unique keys to display as headers
  const headers = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keysSet = new Set<string>();
    data.forEach((row) => {
      if (row && typeof row === "object") {
        Object.keys(row).forEach((key) => {
          if (row[key] !== undefined && row[key] !== null) {
            keysSet.add(key);
          }
        });
      }
    });
    return Array.from(keysSet);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div
        id="table-empty-state"
        className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-xl bg-slate-950/40"
      >
        <p className="text-sm font-mono">No records to display.</p>
      </div>
    );
  }

  // Standard visual column width for beautiful spreadsheet experience
  const colWidth = 200;
  const totalWidth = headers.length * colWidth;

  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const rowData = data[index];
    const isEven = index % 2 === 0;
    return (
      <div
        style={style}
        className={`flex items-center border-b border-slate-900 text-xs text-slate-300 ${
          isEven ? "bg-slate-950/40" : "bg-slate-950/10"
        } hover:bg-slate-800/40 transition-colors`}
      >
        {headers.map((header) => {
          const val = rowData[header];
          const displayVal =
            val === undefined || val === null
              ? ""
              : typeof val === "object"
              ? JSON.stringify(val)
              : String(val);

          // Highlights specific crm fields to make it look highly professional
          const isStatusField = header === "crm_status";
          const isSourceField = header === "data_source";
          const isEmailField = header === "email";

          let cellClass =
            "px-4 py-2 truncate border-r border-slate-900/40 font-mono last:border-r-0 h-full flex items-center";

          return (
            <div
              key={header}
              style={{ width: colWidth }}
              className={cellClass}
              title={displayVal}
            >
              {isStatusField && displayVal ? (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                    displayVal === "GOOD_LEAD_FOLLOW_UP"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : displayVal === "SALE_DONE"
                      ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      : displayVal === "DID_NOT_CONNECT"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {displayVal}
                </span>
              ) : isSourceField && displayVal ? (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50 text-[10px] font-medium font-mono">
                  {displayVal}
                </span>
              ) : isEmailField && displayVal ? (
                <span className="text-cyan-400 hover:underline cursor-pointer truncate">
                  {displayVal}
                </span>
              ) : (
                <span className="truncate text-slate-300">
                  {displayVal || <span className="text-slate-600">—</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      id="virtualized-data-table"
      className="w-full border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden backdrop-blur-sm"
    >
      <div className="overflow-x-auto w-full">
        <div style={{ minWidth: totalWidth || "100%" }}>
          {/* Table Sticky Header */}
          <div className="flex items-center bg-slate-900/90 border-b border-slate-800 text-slate-200 font-bold text-xs sticky top-0 z-10 select-none">
            {headers.map((header) => (
              <div
                key={header}
                style={{ width: colWidth }}
                className="px-4 py-3.5 border-r border-slate-800/60 font-mono tracking-wider text-left uppercase text-slate-400 last:border-r-0"
              >
                {header.replace(/_/g, " ")}
              </div>
            ))}
          </div>

          {/* Table Body utilizing react-window */}
          <List
            style={{
              height: Math.min(maxHeight, data.length * rowHeight),
              width: "100%",
            }}
            rowCount={data.length}
            rowHeight={rowHeight}
            rowComponent={Row as any}
            rowProps={{}}
          />
        </div>
      </div>
      {/* Footer Stats bar */}
      <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Displaying {data.length} records</span>
        <span>{headers.length} unique headers parsed</span>
      </div>
    </div>
  );
}
