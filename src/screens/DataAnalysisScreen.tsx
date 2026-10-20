/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { CsvAnalysisSummary, SimulationSyncPayload } from '../simulation/types.ts';
import { CsvUploadBar } from '../components/CsvUploadBar.tsx';
import { CurrencyDisplay } from '../components/CurrencyDisplay.tsx';
import { LossExposureClock } from '../components/LossExposureClock.tsx';
import { calculateFinancialLoss } from '../simulation/financial.ts';
import { simulationClient } from '../services/simulationClient.ts';

interface DataAnalysisScreenProps {
  state: SimulationSyncPayload;
  onNavigate: (route: string) => void;
}

export const DataAnalysisScreen: React.FC<DataAnalysisScreenProps> = ({
  state,
  onNavigate,
}) => {
  const { csvSummary, incidentStartTime, protectionMode } = state;
  const [activeCsv, setActiveCsv] = useState<CsvAnalysisSummary | null>(csvSummary);

  const [downtime, setDowntime] = useState<number>(45);
  const [lossRate, setLossRate] = useState<number>(8500);
  const [wastedCost, setWastedCost] = useState<number>(245000);
  const [recoveryCost, setRecoveryCost] = useState<number>(65000);

  // Gemini AI Analysis State for CSV Data
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const calculatedLoss = calculateFinancialLoss({
    downtimeMinutes: downtime,
    lossPerMinute: lossRate,
    wastedMaterialCost: activeCsv ? activeCsv.totalWastedCost : wastedCost,
    recoveryCost: recoveryCost,
  });

  const handleCsvLoaded = async (summary: CsvAnalysisSummary) => {
    setActiveCsv(summary);
    setAiAnalysis(null);
    setAiError(null);
    await simulationClient.submitCsvSummary(summary);
  };

  const handleAnalyseWithGemini = async () => {
    if (!activeCsv) {
      setAiError('Please upload or load an industrial CSV dataset before running Gemini AI analysis.');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const res = await simulationClient.getAiAnalysis({
        type: 'CSV_LOG',
        csvSummary: activeCsv,
        financialAssessment: {
          downtimeLossTotal: calculatedLoss.downtimeLossTotal,
          wastedMaterialCost: activeCsv.totalWastedCost,
          recoveryCost: recoveryCost,
          totalEstimatedLoss: activeCsv.totalCalculatedLoss,
        },
      });

      if (res.success && res.analysis) {
        setAiAnalysis(res.analysis);
      } else {
        setAiError(res.error || 'Failed to generate AI analysis for the CSV dataset.');
      }
    } catch (err) {
      setAiError('An unexpected error occurred while requesting Gemini AI analysis.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#182030] pb-5">
        <div>
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
            Historical Data & Financial Exposure Model
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Data & Loss Analysis
          </h1>
        </div>
        <div className="text-xs text-slate-400 bg-[#121824] border border-[#1e283d] px-3 py-1.5 rounded-lg shrink-0">
          Model: Production Downtime + Batch Thermal Waste
        </div>
      </div>

      {/* Prominent CSV Upload Bar */}
      <CsvUploadBar
        onSummaryLoaded={handleCsvLoaded}
        onAnalyseWithGemini={handleAnalyseWithGemini}
        onNavigateToIncidents={() => onNavigate('/incidents')}
        activeSummary={activeCsv}
        isAiLoading={aiLoading}
      />

      {/* CSV Gemini AI Investigation Section (Rendered directly on Data & Loss Analysis Page) */}
      <div className="bg-[#121620] border border-[#202738] rounded-xl p-6 text-[#e6edf3]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1e2536]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <h2 className="text-base font-bold text-white">
              Gemini AI Dataset Investigation
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {activeCsv && (
              <button
                type="button"
                onClick={handleAnalyseWithGemini}
                disabled={aiLoading}
                aria-label="Re-analyze CSV with Gemini AI"
                className="px-3.5 py-1.5 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 min-h-[36px]"
              >
                <span>↻</span>
                <span>{aiLoading ? 'Analyzing...' : 'Re-analyze CSV'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('/ai-analyst')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#1a2233] border border-[#2a3752] hover:border-blue-400 rounded-lg transition-colors flex items-center gap-1 min-h-[36px]"
            >
              <span>Open Dedicated AI Analyst Page</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* State 1: Ready to Analyze (No analysis yet) */}
        {!aiLoading && !aiAnalysis && !aiError && (
          <div className="p-6 text-center bg-[#0d1017] rounded-xl border border-[#1e2536] space-y-3">
            <div className="text-sm font-semibold text-slate-200">
              {activeCsv
                ? `Dataset "${activeCsv.filename}" loaded (${activeCsv.validRows} valid rows).`
                : 'No industrial CSV dataset loaded yet.'}
            </div>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              Click <strong className="text-amber-400 font-extrabold">"Analyse with Gemini AI"</strong> above to run an AI threat and financial impact investigation on the uploaded telemetry records.
            </p>
            {activeCsv && (
              <button
                type="button"
                onClick={handleAnalyseWithGemini}
                className="px-5 py-2.5 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-md min-h-[40px] cursor-pointer"
              >
                Analyse with Gemini AI ✨
              </button>
            )}
          </div>
        )}

        {/* State 2: Analysing (Loading) */}
        {aiLoading && (
          <div className="p-8 text-center bg-[#0d1017] rounded-xl border border-[#1e2536] space-y-3 animate-pulse" aria-live="polite">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="text-xs font-mono text-amber-400 font-bold">
              Querying Gemini AI server for industrial CSV evidence analysis...
            </div>
            <p className="text-[11px] text-slate-400">
              Correlating {activeCsv?.validRows || 31} imported records, peak temperature ({activeCsv?.peakTemp || 218}°C), and ₹{(activeCsv?.totalCalculatedLoss || 692500).toLocaleString('en-IN')} calculated loss...
            </p>
          </div>
        )}

        {/* State 3: Analysis Failed (Error + Working Retry Button) */}
        {aiError && !aiLoading && (
          <div className="p-5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-red-300 text-xs sm:text-sm">
              <span>⚠️ Analysis Failed:</span>
              <span>{aiError}</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              The Gemini service was unable to complete the request. Your imported CSV data and calculated financial loss figures remain intact and visible.
            </p>
            <button
              type="button"
              onClick={handleAnalyseWithGemini}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer min-h-[38px] shadow-sm"
            >
              Retry Analysis
            </button>
          </div>
        )}

        {/* State 4: Analysis Complete */}
        {aiAnalysis && !aiLoading && (
          <div className="space-y-4 text-xs">
            {/* What Happened */}
            <div className="p-4 bg-[#161c2a] rounded-xl border border-[#243048]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  What Happened
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-extrabold uppercase text-[10px] ${
                    aiAnalysis.riskLevel === 'CRITICAL'
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  Risk Level: {aiAnalysis.riskLevel || 'HIGH'}
                </span>
              </div>
              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                {aiAnalysis.whatHappened || aiAnalysis.summary}
              </p>
            </div>

            {/* Correlated Telemetry Evidence */}
            {aiAnalysis.evidencePoints && aiAnalysis.evidencePoints.length > 0 && (
              <div className="p-4 bg-[#141a27] rounded-xl border border-[#20293d]">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Correlated Telemetry Evidence
                </div>
                <ul className="space-y-1.5 pl-4 list-disc text-slate-200">
                  {aiAnalysis.evidencePoints.map((point: string, idx: number) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Financial Impact & Possible Root Causes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#141a27] rounded-xl border border-[#20293d]">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                  Financial Impact Analysis
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {aiAnalysis.financialImpact || `Total calculated financial exposure is ₹${(activeCsv?.totalCalculatedLoss || calculatedLoss.totalEstimatedLoss).toLocaleString('en-IN')}, combining downtime loss and scrapped batch material.`}
                </p>
              </div>

              <div className="p-4 bg-[#141a27] rounded-xl border border-[#20293d]">
                <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                  Plausible Root Causes
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {aiAnalysis.possibleCauses || `Plausible causes include remote PLC setpoint overrides or controller misconfiguration, distinguished from gradual physical element wear.`}
                </p>
              </div>
            </div>

            {/* Recommended Preventive Actions */}
            {aiAnalysis.prevention && (
              <div className="p-4 bg-[#141a27] rounded-xl border border-[#20293d]">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  Recommended Preventive Controls
                </div>
                {Array.isArray(aiAnalysis.prevention) ? (
                  <ul className="space-y-1.5 pl-4 list-disc text-slate-200">
                    {aiAnalysis.prevention.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-200 leading-relaxed">{aiAnalysis.prevention}</p>
                )}
              </div>
            )}

            {/* Uncertainty & Telemetry Gaps */}
            {aiAnalysis.missingEvidence && (
              <div className="p-3.5 bg-[#0e121a] rounded-xl border border-[#1a2233] text-[11px] text-slate-400 italic">
                <strong className="text-slate-300 not-italic">Note on Uncertainty & Telemetry Gaps: </strong>
                {aiAnalysis.missingEvidence}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Financial Exposure Clock */}
      <LossExposureClock
        isIncidentActive={true}
        incidentStartTime={incidentStartTime}
        baseLossPerMinute={lossRate}
        baseWastedCost={activeCsv ? activeCsv.totalWastedCost : wastedCost}
        baseRecoveryCost={recoveryCost}
        isProtected={protectionMode}
      />

      {/* Validated Data Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Data Scope
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums">
            {activeCsv ? activeCsv.totalRows.toLocaleString() : '1,240'}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {activeCsv ? `File: ${activeCsv.filename}` : 'Sample dataset loaded'}
          </div>
        </div>

        <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Peak Temperature
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-red-400 tabular-nums">
            {activeCsv ? `${activeCsv.peakTemp}°C` : '220.0°C'}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Certified Limit: 185.0°C
          </div>
        </div>

        <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Flagged Anomalies
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tabular-nums">
            {activeCsv ? activeCsv.anomalyCount : '12'}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Breached threshold
          </div>
        </div>

        <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Estimated Loss
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-red-400 tabular-nums">
            <CurrencyDisplay
              amount={activeCsv ? activeCsv.totalCalculatedLoss : calculatedLoss.totalEstimatedLoss}
            />
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Illustrative estimate
          </div>
        </div>
      </div>

      {/* Interactive Financial Calculator & Breakdown */}
      <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#1a2336]">
          <div>
            <h2 className="text-lg font-bold text-white">
              Financial Loss Calculation & Assumptions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust parameters below to evaluate simulated production exposure scenarios.
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-[#161f30] px-3 py-1 rounded-full font-mono">
            Currency: INR (₹)
          </span>
        </div>

        {/* 3 Component Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-[#0a0d14] rounded-xl border border-[#182030]">
            <div className="text-xs font-medium text-slate-400 mb-1">Downtime Loss Component</div>
            <div className="text-xl font-extrabold text-white font-mono">
              <CurrencyDisplay amount={calculatedLoss.downtimeLossTotal} />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {downtime} mins × <CurrencyDisplay amount={lossRate} />/min
            </div>
          </div>

          <div className="p-4 bg-[#0a0d14] rounded-xl border border-[#182030]">
            <div className="text-xs font-medium text-slate-400 mb-1">Wasted Material Cost</div>
            <div className="text-xl font-extrabold text-white font-mono">
              <CurrencyDisplay amount={activeCsv ? activeCsv.totalWastedCost : wastedCost} />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Scrapped thermal batch
            </div>
          </div>

          <div className="p-4 bg-[#0a0d14] rounded-xl border border-[#182030]">
            <div className="text-xs font-medium text-slate-400 mb-1">Inspection & Recalibration</div>
            <div className="text-xl font-extrabold text-white font-mono">
              <CurrencyDisplay amount={recoveryCost} />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Safety verification overhead
            </div>
          </div>
        </div>

        {/* Interactive Sliders */}
        <div className="p-5 bg-[#0a0d14] rounded-xl border border-[#182030] space-y-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Simulation Parameter Sliders
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                <span>Downtime Duration</span>
                <span className="font-bold text-blue-400 font-mono">{downtime} minutes</span>
              </div>
              <input
                type="range"
                min="10"
                max="180"
                step="5"
                value={downtime}
                onChange={(e) => setDowntime(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 h-2 bg-[#1b2438] rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                <span>Production Contribution / Minute</span>
                <span className="font-bold text-blue-400 font-mono">
                  <CurrencyDisplay amount={lossRate} />
                </span>
              </div>
              <input
                type="range"
                min="2000"
                max="25000"
                step="500"
                value={lossRate}
                onChange={(e) => setLossRate(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 h-2 bg-[#1b2438] rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="mt-5 p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg text-xs text-blue-300 flex items-center justify-between">
          <span>
            ℹ️ All calculated figures represent illustrative financial loss estimates derived from simulated operational downtime and materials parameters.
          </span>
          <button
            type="button"
            onClick={() => onNavigate('/ai-analyst')}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline shrink-0 ml-4 cursor-pointer"
          >
            Analyze with AI Analyst →
          </button>
        </div>
      </div>
    </div>
  );
};
