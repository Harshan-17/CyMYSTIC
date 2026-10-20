/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { simulationClient } from '../services/simulationClient.ts';
import type { CsvAnalysisSummary, SimulationSyncPayload } from '../simulation/types.ts';

interface GeminiAnalystProps {
  state: SimulationSyncPayload;
  csvSummary?: CsvAnalysisSummary | null;
  onApplyProtection?: (actionId: string, title: string) => Promise<void>;
}

export const GeminiAnalyst: React.FC<GeminiAnalystProps> = ({
  state,
  csvSummary,
  onApplyProtection,
}) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState<boolean>(false);

  // Accessible Review Modal State
  const [selectedRec, setSelectedRec] = useState<{
    id: string;
    title: string;
    description: string;
  } | null>(null);
  const [applying, setApplying] = useState<boolean>(false);
  const [appliedStatus, setAppliedStatus] = useState<string | null>(null);

  const fetchAiAnalysis = async () => {
    setLoading(true);
    const result = await simulationClient.getAiAnalysis({
      type: csvSummary ? 'CSV_LOG' : 'CYBER_PHYSICAL_INCIDENT',
      evidence: state.activeIncident,
      csvSummary,
      financialAssessment: state.financialAssessment,
    });
    setAnalysis(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchAiAnalysis();
  }, [state.activeIncident?.id, csvSummary?.filename]);

  const handleAskQuestion = async (q: string) => {
    if (!q.trim()) return;
    setAsking(true);
    const answer = await simulationClient.askAiQuestion(q, {
      activeIncident: state.activeIncident,
      financialAssessment: state.financialAssessment,
      csvSummary,
    });
    setAiAnswer(answer);
    setAsking(false);
  };

  const sampleQuestions = [
    'What is this countdown?',
    'Why is financial exposure increasing?',
    'How can we prevent this loss?',
  ];

  return (
    <div className="bg-[#121620] border border-[#202738] rounded-xl p-5 mb-6 text-[#e6edf3]">
      {/* Accessible Confirmation Status Banner */}
      {appliedStatus && (
        <div
          aria-live="polite"
          className="mb-4 p-3 bg-emerald-950/80 border border-emerald-600/80 rounded-lg text-xs font-bold text-emerald-200 flex items-center justify-between gap-2 shadow-md animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{appliedStatus}</span>
          </div>
          <button
            onClick={() => setAppliedStatus(null)}
            className="text-emerald-400 hover:text-white p-1 text-xs"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-4 border-b border-[#1e2536] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></div>
          <h2 className="text-base font-bold text-white">
            CYMYSTIC AI Investigator
          </h2>
        </div>
        <button
          onClick={fetchAiAnalysis}
          disabled={loading}
          aria-label="Re-analyze evidence with CYMYSTIC AI"
          className="min-h-[38px] px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <span aria-hidden="true">↻</span>
          <span>{loading ? 'Analyzing...' : 'Re-analyze Evidence'}</span>
        </button>
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs text-amber-400/90 animate-pulse font-mono" aria-live="polite">
          Querying Gemini AI server for cyber-physical evidence analysis...
        </div>
      ) : analysis ? (
        <div className="space-y-4 text-xs">
          {/* Summary & Risk Level */}
          <div className="p-3.5 bg-[#171d2b] rounded-lg border border-[#253046]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                Executive Synthesis
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                  analysis.riskLevel === 'CRITICAL'
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                Risk: {analysis.riskLevel || 'HIGH'}
              </span>
            </div>
            <p className="text-slate-200 leading-relaxed font-sans text-xs sm:text-sm">
              {analysis.summary}
            </p>
          </div>

          {/* Evidence Points */}
          {analysis.evidencePoints && analysis.evidencePoints.length > 0 && (
            <div>
              <div className="text-slate-400 font-semibold mb-1.5 uppercase text-[11px] tracking-wider">
                Correlated Evidence Points
              </div>
              <ul className="space-y-1 pl-4 list-disc text-slate-300 font-sans">
                {analysis.evidencePoints.map((point: string, idx: number) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Evidence Note */}
          {analysis.missingEvidence && (
            <div className="text-slate-400 text-[11px] italic">
              <strong>Note on Missing Telemetry:</strong> {analysis.missingEvidence}
            </div>
          )}

          {/* Actionable Recommendations with Accessible Review & Apply Protection Buttons */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="pt-2">
              <div className="text-slate-300 font-bold mb-2 uppercase text-[11px] tracking-wider">
                Operator-Approved Preventive Controls
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.recommendations.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#181f2f] rounded-xl border border-[#29354d] flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="font-extrabold text-white text-sm mb-1">
                        {rec.title}
                      </div>
                      <div className="text-slate-300 text-xs leading-relaxed">
                        {rec.description}
                      </div>
                    </div>
                    {onApplyProtection && (
                      <button
                        type="button"
                        onClick={() => setSelectedRec(rec)}
                        aria-label={`Review and apply protection: ${rec.title}`}
                        className="w-full min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-lg shadow-md hover:shadow-lg transition-all border border-amber-200/50 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-[#181f2f]"
                      >
                        <span>Review & Apply Protection</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Contextual Q&A Input */}
      <div className="mt-5 pt-4 border-t border-[#1e2536]">
        <div className="text-xs font-semibold text-slate-400 mb-2">
          Ask CYMYSTIC AI Assistant
        </div>

        {/* Quick Question Pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setUserQuestion(q);
                handleAskQuestion(q);
              }}
              aria-label={`Ask quick question: ${q}`}
              className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#19202e] border border-[#273248] hover:border-amber-400 hover:text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskQuestion(userQuestion);
            }}
            placeholder="Ask about this incident, loss calculation, or prevention strategy..."
            className="flex-1 bg-[#0d1017] border border-[#242e42] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[44px]"
            aria-label="Question prompt for CYMYSTIC AI"
          />
          <button
            type="button"
            onClick={() => handleAskQuestion(userQuestion)}
            disabled={asking || !userQuestion.trim()}
            aria-label="Submit question to CYMYSTIC AI"
            className="min-h-[44px] px-4 py-2.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 shrink-0"
          >
            {asking ? 'Asking...' : 'Ask'}
          </button>
        </div>

        {aiAnswer && (
          <div
            aria-live="polite"
            className="mt-3 p-3.5 bg-[#151c2a] rounded-lg border border-[#243046] text-xs sm:text-sm text-amber-200 leading-relaxed font-sans"
          >
            <strong className="text-white">CYMYSTIC AI:</strong> {aiAnswer}
          </div>
        )}
      </div>

      {/* Interactive Accessible Review Protection Modal */}
      {selectedRec && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div className="bg-[#121826] border border-[#2b3954] rounded-2xl p-6 max-w-lg w-full text-white shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-[#1f2b42] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <h3 id="review-modal-title" className="text-base font-extrabold text-white">
                  Review Proposed Protection Control
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRec(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-label="Close review modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-[#0e131f] rounded-xl border border-[#223048]">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                  Proposed Action
                </div>
                <div className="text-sm font-extrabold text-white">
                  {selectedRec.title}
                </div>
                <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {selectedRec.description}
                </div>
              </div>

              <div className="p-3.5 bg-[#0e131f] rounded-xl border border-[#223048] space-y-2 text-xs">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  Operating Policy & Safety Bounds
                </div>
                <p className="text-slate-300 leading-relaxed">
                  • Bounds remote PLC setpoint commands strictly within certified operating limits (175°C–185°C).
                </p>
                <p className="text-slate-300 leading-relaxed">
                  • Enforces two-factor Operator Verification Challenge for unauthenticated setpoint change requests.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-[#1f2b42]">
              <button
                type="button"
                onClick={() => setSelectedRec(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-300 bg-[#182133] hover:bg-[#202d45] border border-[#2c3d5e] rounded-xl transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onApplyProtection) {
                    setApplying(true);
                    await onApplyProtection(selectedRec.id, selectedRec.title);
                    setApplying(false);
                    setAppliedStatus(`Protection active: ${selectedRec.title}`);
                    setSelectedRec(null);
                    setTimeout(() => setAppliedStatus(null), 5000);
                  }
                }}
                disabled={applying}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-xl transition-colors shadow-lg min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {applying ? 'Applying Protection...' : 'Confirm & Apply Protection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
