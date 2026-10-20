/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { parseIndustrialCsv } from '../utils/csvParser.ts';
import type { CsvAnalysisSummary } from '../simulation/types.ts';
import { CurrencyDisplay } from './CurrencyDisplay.tsx';

interface CsvUploadBarProps {
  onSummaryLoaded: (summary: CsvAnalysisSummary) => void;
  onAnalyseWithGemini?: () => void;
  onNavigateToIncidents?: () => void;
  activeSummary?: CsvAnalysisSummary | null;
  isAiLoading?: boolean;
}

export const CsvUploadBar: React.FC<CsvUploadBarProps> = ({
  onSummaryLoaded,
  onAnalyseWithGemini,
  onNavigateToIncidents,
  activeSummary,
  isAiLoading = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Invalid file type. Please upload a valid CSV file (.csv).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds 5 MB limit.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setWarnings([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseIndustrialCsv(text, file.name);

        if (!result.success || !result.summary) {
          setErrorMessage(result.errors.join(' '));
        } else {
          setWarnings(result.warnings);
          onSummaryLoaded(result.summary);
        }
      } catch (err) {
        setErrorMessage('Failed to read CSV file content.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Error reading file from disk.');
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-[#121620] border border-[#202738] rounded-xl p-5 mb-6 text-[#e6edf3]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Data Analysis
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400 font-mono">CSV Upload</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-0.5">
            Analyse Industrial Data
          </h2>
        </div>

        <a
          href="/sample_industrial_data.csv"
          download="sample_industrial_data.csv"
          className="text-xs text-amber-400/90 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1.5 transition-colors"
        >
          <span>↓</span>
          <span>Download sample industrial CSV</span>
        </a>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-[#293246] hover:border-amber-500/50 bg-[#161b28]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#20283a] border border-[#2e3a54] flex items-center justify-center text-amber-400 text-lg">
            ↑
          </div>
          <div className="text-sm font-medium text-slate-200">
            {loading ? (
              <span className="text-amber-400 animate-pulse">Parsing CSV records...</span>
            ) : (
              <>
                Drag & drop industrial telemetry CSV here or <span className="text-amber-400 underline">browse</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-400">
            Supports: <code className="text-slate-300 font-mono">timestamp, machine_id, target_temperature, measured_temperature, downtime_minutes, wasted_material_cost</code>
          </div>
        </div>
      </div>

      {/* Feedback & Error Messages */}
      {errorMessage && (
        <div className="mt-3 p-3 bg-red-950/40 border border-red-800/60 rounded text-xs text-red-300">
          <strong>CSV Validation Error:</strong> {errorMessage}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-2 text-xs text-amber-400/80 space-y-0.5">
          {warnings.slice(0, 3).map((w, idx) => (
            <div key={idx}>⚠️ {w}</div>
          ))}
        </div>
      )}

      {/* Uploaded Summary Display */}
      {activeSummary && (
        <div className="mt-4 pt-4 border-t border-[#1e2536] bg-[#0d1017] rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-bold text-white font-mono">
                {activeSummary.filename}
              </span>
              <span className="text-xs text-slate-400">
                ({activeSummary.validRows} valid rows imported)
              </span>
            </div>

            {onAnalyseWithGemini ? (
              <button
                type="button"
                onClick={onAnalyseWithGemini}
                disabled={isAiLoading}
                aria-label="Analyse uploaded CSV data with Gemini AI"
                className="px-3.5 py-1.5 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 min-h-[36px]"
              >
                <span>{isAiLoading ? 'Analyzing CSV...' : 'Analyse with Gemini AI ✨'}</span>
              </button>
            ) : onNavigateToIncidents ? (
              <button
                type="button"
                onClick={onNavigateToIncidents}
                aria-label="Analyse uploaded CSV data with Gemini AI"
                className="px-3.5 py-1.5 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm min-h-[36px]"
              >
                <span>Analyse with Gemini AI ✨</span>
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-[#141924] rounded border border-[#212a3d]">
              <div className="text-slate-400 mb-0.5">Avg / Peak Temp</div>
              <div className="font-bold text-white font-mono">
                {activeSummary.avgTemp}°C / <span className="text-red-400">{activeSummary.peakTemp}°C</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#141924] rounded border border-[#212a3d]">
              <div className="text-slate-400 mb-0.5">Total Downtime</div>
              <div className="font-bold text-white font-mono">
                {activeSummary.downtimeMinutes} min
              </div>
            </div>

            <div className="p-2.5 bg-[#141924] rounded border border-[#212a3d]">
              <div className="text-slate-400 mb-0.5">Material Damage</div>
              <div className="font-bold text-white">
                <CurrencyDisplay amount={activeSummary.totalWastedCost} />
              </div>
            </div>

            <div className="p-2.5 bg-[#141924] rounded border border-[#212a3d]">
              <div className="text-slate-400 mb-0.5">Total Calculated Loss</div>
              <div className="font-bold text-red-400">
                <CurrencyDisplay amount={activeSummary.totalCalculatedLoss} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
