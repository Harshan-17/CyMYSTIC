/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { SimulationSyncPayload } from '../simulation/types.ts';
import { GeminiAnalyst } from '../components/GeminiAnalyst.tsx';
import { simulationClient } from '../services/simulationClient.ts';

interface AiAnalystScreenProps {
  state: SimulationSyncPayload;
  onNavigate: (route: string) => void;
}

export const AiAnalystScreen: React.FC<AiAnalystScreenProps> = ({
  state,
  onNavigate,
}) => {
  const { csvSummary } = state;

  const handleApplyProtection = async (actionId: string, title: string) => {
    await simulationClient.applyProtectionAction(actionId, title);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#182030] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              AI Security Intelligence
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-mono">Gemini 3.8 Flash</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AI Cyberattack Analyst
          </h1>
        </div>
        <button
          onClick={() => onNavigate('/incidents')}
          className="px-3.5 py-2 text-xs font-semibold bg-[#141c2c] hover:bg-[#1a253a] border border-[#22304a] text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>View Incident Evidence</span>
          <span>→</span>
        </button>
      </div>

      {/* Gemini AI Analyst Main Component */}
      <GeminiAnalyst
        state={state}
        csvSummary={csvSummary}
        onApplyProtection={handleApplyProtection}
      />
    </div>
  );
};
