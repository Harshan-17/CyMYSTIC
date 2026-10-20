/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { CsvAnalysisSummary, SimulationSyncPayload } from '../simulation/types.ts';
import { TemperatureChart } from '../components/TemperatureChart.tsx';
import { CurrencyDisplay } from '../components/CurrencyDisplay.tsx';
import { CsvUploadBar } from '../components/CsvUploadBar.tsx';
import { LossExposureClock } from '../components/LossExposureClock.tsx';
import { OperatorVerificationModal } from '../components/OperatorVerificationModal.tsx';
import { simulationClient } from '../services/simulationClient.ts';

interface DashboardScreenProps {
  state: SimulationSyncPayload;
  onNavigate: (route: string) => void;
  onTriggerAttack?: () => Promise<void>;
  onTriggerNormal?: () => Promise<void>;
  onReset?: () => Promise<void>;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  state,
  onNavigate,
}) => {
  const {
    machineState,
    sensorHistory,
    activeIncident,
    financialAssessment,
    pendingCommand,
    csvSummary,
    incidentStartTime,
    protectionMode,
  } = state;

  const [activeCsv, setActiveCsv] = useState<CsvAnalysisSummary | null>(csvSummary);

  const isAttack = activeIncident?.classification === 'CYBER_PHYSICAL_ATTACK';
  const isAnomaly = activeIncident?.classification === 'ISOLATED_PHYSICAL_ANOMALY';
  const isSuspiciousCmd = activeIncident?.classification === 'ISOLATED_COMMAND';
  const isWarning = machineState.status === 'WARNING' || isSuspiciousCmd;
  const isCritical = isAttack || isAnomaly || machineState.status === 'CRITICAL_INCIDENT';

  const statusText = protectionMode
    ? 'Protected'
    : isCritical
    ? 'Critical Incident'
    : isWarning
    ? 'Warning'
    : 'Normal Operation';

  const handleCsvSummaryLoaded = async (summary: CsvAnalysisSummary) => {
    setActiveCsv(summary);
    await simulationClient.submitCsvSummary(summary);
  };

  const handleOperatorVerification = async (approved: boolean) => {
    await simulationClient.verifyPendingCommand(approved);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Section: Branding, Machine Status, Heading & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#182030] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-cymystic text-sm font-bold text-blue-400 tracking-wide">
              CyMYSTIC
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-mono">Machine 01 · Industrial Reactor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Operations Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time physical telemetry, cyber-physical threat detection, and financial loss monitoring.
          </p>
        </div>

        {/* Status Badge & Action */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border uppercase tracking-wider ${
              protectionMode
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                : isCritical
                ? 'bg-red-950/80 text-red-300 border-red-700/60 animate-pulse'
                : isWarning
                ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
            }`}
          >
            {statusText}
          </span>

          {(isCritical || isWarning || activeCsv) && (
            <button
              onClick={() => onNavigate('/incidents')}
              className="px-3.5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-md shadow-red-900/30 flex items-center gap-1.5"
            >
              <span>Investigate</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>

      {/* Operator Verification Modal Challenge */}
      {pendingCommand && (
        <OperatorVerificationModal
          pendingCommand={pendingCommand}
          onRespond={handleOperatorVerification}
        />
      )}

      {/* PROMINENT CSV UPLOAD SECTION AT TOP */}
      <CsvUploadBar
        onSummaryLoaded={handleCsvSummaryLoaded}
        onNavigateToIncidents={() => onNavigate('/incidents')}
        activeSummary={activeCsv}
      />

      {/* 4 STATUS PANELS BELOW CSV UPLOAD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Panel 1: Machine Status */}
        <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 mb-1">Machine Status</div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isCritical ? 'bg-red-500 animate-ping' : isWarning ? 'bg-amber-500' : 'bg-emerald-400'
              }`}
            />
            <span className="text-lg font-bold text-white uppercase tracking-tight">
              {machineState.status}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            ID: {machineState.id}
          </div>
        </div>

        {/* Panel 2: Protection Mode */}
        <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 mb-1">Protection Policy</div>
          <div className="text-lg font-bold text-white">
            {protectionMode ? (
              <span className="text-emerald-400">ACTIVE — ENFORCED</span>
            ) : (
              <span className="text-slate-300">STANDARD MONITORING</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {protectionMode ? '175°–185°C hard limits' : 'Manual operator overrides'}
          </div>
        </div>

        {/* Panel 3: Current Target Temperature */}
        <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 mb-1">Target Temperature</div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${
                machineState.targetTemp > 185 ? 'text-amber-400' : 'text-slate-200'
              }`}
            >
              {machineState.targetTemp}
            </span>
            <span className="text-sm font-mono text-slate-400">°C</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Normal: 180°C Baseline
          </div>
        </div>

        {/* Panel 4: Estimated Financial Exposure */}
        <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 mb-1">Financial Exposure</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-400 font-mono tabular-nums">
            <CurrencyDisplay
              amount={
                activeCsv
                  ? activeCsv.totalCalculatedLoss
                  : financialAssessment
                  ? financialAssessment.totalEstimatedLoss
                  : 0
              }
            />
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {financialAssessment || activeCsv ? 'Estimated potential loss' : 'No active incident'}
          </div>
        </div>
      </div>

      {/* FINANCIAL EXPOSURE TREND TIMER (Loss Exposure Clock) */}
      {(isCritical || isWarning || activeCsv) && (
        <LossExposureClock
          isIncidentActive={!!activeIncident || !!activeCsv}
          incidentStartTime={incidentStartTime}
          baseLossPerMinute={8500}
          baseWastedCost={activeCsv ? activeCsv.totalWastedCost : (financialAssessment?.wastedMaterialCost || 245000)}
          baseRecoveryCost={financialAssessment?.recoveryCost || 65000}
          isProtected={protectionMode}
        />
      )}

      {/* TEMPERATURE TREND CHART */}
      <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-white">
              Reactor Temperature Response
            </h2>
            <p className="text-xs text-slate-400">
              Measured vs Target setpoint timeline (Certified safe range: 175°C - 185°C)
            </p>
          </div>
          <div className="text-xs font-mono text-slate-300 bg-[#0a0d14] px-3 py-1 rounded border border-[#1a2336]">
            Current: <span className={machineState.currentTemp > 185 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{machineState.currentTemp.toFixed(1)}°C</span>
          </div>
        </div>
        <TemperatureChart
          readings={sensorHistory}
          targetTemp={machineState.targetTemp}
          height={220}
        />
      </div>

      {/* COMPACT AI ANALYST FINDING CARD WITH BUTTON TO OPEN AI ANALYST */}
      <div className="bg-gradient-to-r from-[#121929] to-[#0f1422] border border-blue-900/40 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1 uppercase tracking-wider">
              <span>Gemini AI Security Finding</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 font-mono text-[10px]">Contextual Analysis</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl">
              {isAttack
                ? 'Unscheduled setpoint change (180°C → 220°C) correlated with immediate thermal overshoot. Cyber-physical attack pattern verified.'
                : activeCsv
                ? `CSV log dataset '${activeCsv.filename}' parsed with ${activeCsv.anomalyCount} thermal anomalies exceeding safe boundaries.`
                : 'Reactor 01 is currently operating within certified 180°C baseline safety parameters.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/ai-analyst')}
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shadow-md shadow-blue-900/30 shrink-0 self-start sm:self-auto"
        >
          Open AI Analyst →
        </button>
      </div>
    </div>
  );
};
