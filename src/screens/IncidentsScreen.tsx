/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { SimulationSyncPayload } from '../simulation/types.ts';
import { MACHINE_ID, NORMAL_TEMP_MAX, NORMAL_TEMP_MIN } from '../simulation/constants.ts';
import { TemperatureChart } from '../components/TemperatureChart.tsx';
import { CurrencyDisplay } from '../components/CurrencyDisplay.tsx';
import { LossExposureClock } from '../components/LossExposureClock.tsx';
import { calculateFinancialLoss } from '../simulation/financial.ts';
import { simulationClient } from '../services/simulationClient.ts';

interface IncidentsScreenProps {
  state: SimulationSyncPayload;
  onNavigate: (route: string) => void;
  onReset: () => Promise<void>;
  onTriggerAttack: () => Promise<void>;
}

export const IncidentsScreen: React.FC<IncidentsScreenProps> = ({
  state,
  onNavigate,
  onReset,
  onTriggerAttack,
}) => {
  const {
    activeIncident,
    sensorHistory,
    machineState,
    csvSummary,
    incidentStartTime,
    protectionMode,
    protectionAuditLog,
  } = state;

  const [downtime, setDowntime] = useState<number>(45);
  const [lossRate, setLossRate] = useState<number>(8500);
  const [wastedCost, setWastedCost] = useState<number>(245000);
  const [recoveryCost, setRecoveryCost] = useState<number>(65000);

  const calculatedLoss = calculateFinancialLoss({
    downtimeMinutes: downtime,
    lossPerMinute: lossRate,
    wastedMaterialCost: wastedCost,
    recoveryCost: recoveryCost,
  });

  const isIncidentActive = (!!activeIncident && activeIncident.classification !== 'NORMAL') || !!csvSummary;
  const isAttack = activeIncident?.classification === 'CYBER_PHYSICAL_ATTACK';

  const handleApplyProtection = async (actionId: string, title: string) => {
    await simulationClient.applyProtectionAction(actionId, title);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#182030] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Incident Response & Evidence
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-mono">Machine 01</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Incidents & Protection
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!isIncidentActive ? (
            <button
              onClick={onTriggerAttack}
              className="px-3.5 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-sm shadow-red-900/40"
            >
              Trigger Simulated Attack
            </button>
          ) : (
            <button
              onClick={onReset}
              className="px-3.5 py-2 text-xs font-bold bg-[#182236] hover:bg-[#202d47] border border-[#2b3b5c] text-slate-200 rounded-lg transition-colors"
            >
              Reset Simulation to 180°C
            </button>
          )}
        </div>
      </div>

      {!isIncidentActive ? (
        /* Standby State */
        <div className="bg-[#101522] border border-[#1b2336] rounded-2xl p-10 text-center max-w-xl mx-auto my-8 space-y-4">
          <div className="w-12 h-12 mx-auto bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">
            No Active Incidents Detected
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Machine 01 is currently operating within certified 180°C baseline limits ({NORMAL_TEMP_MIN}°–{NORMAL_TEMP_MAX}°C).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onTriggerAttack}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-md shadow-red-900/30"
            >
              Simulate Attack (180°C → 220°C)
            </button>
            <button
              onClick={() => onNavigate('/attacker')}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-[#161e2e] border border-[#26344d] rounded-lg hover:bg-[#1d283d] transition-colors"
            >
              Open Phone Simulator
            </button>
          </div>
        </div>
      ) : (
        /* Active Incident Workflow */
        <div className="space-y-6">
          {/* A. INCIDENT HEADER */}
          <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Machine 01
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-blue-400 font-semibold bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded">
                    {csvSummary ? `CSV Dataset: ${csvSummary.filename}` : 'Simulation'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {csvSummary ? 'Industrial Log Anomaly Investigation' : 'Suspicious Temperature Change'}
                </h2>
              </div>

              {/* One Clear Severity Indicator */}
              <span
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg uppercase tracking-wider border ${
                  isAttack || (csvSummary && csvSummary.anomalyCount > 0)
                    ? 'bg-red-950/90 text-red-300 border-red-700/60 animate-pulse'
                    : 'bg-amber-950/90 text-amber-300 border-amber-700/60'
                }`}
              >
                {isAttack || (csvSummary && csvSummary.anomalyCount > 0) ? 'Critical Severity' : 'Warning Level'}
              </span>
            </div>
          </div>

          {/* B. TEMPERATURE CHANGE PROMINENT DISPLAY */}
          <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-6">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Temperature Setpoint Override Evidence
            </div>
            <div className="flex items-baseline gap-4 mb-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-400 font-mono">180°C</span>
              <span className="text-2xl text-red-400 font-bold">→</span>
              <span className="text-3xl sm:text-4xl font-extrabold text-red-400 font-mono">
                {csvSummary ? `${csvSummary.peakTemp}°C` : '220°C'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Target temperature setpoint was changed from 180°C to {csvSummary ? `${csvSummary.peakTemp}°C` : '220°C'}, breaching certified safe threshold of 185°C.
            </p>
          </div>

          {/* C. FINANCIAL LOSS EXPOSURE CLOCK */}
          <LossExposureClock
            isIncidentActive={true}
            incidentStartTime={incidentStartTime}
            baseLossPerMinute={lossRate}
            baseWastedCost={csvSummary ? csvSummary.totalWastedCost : wastedCost}
            baseRecoveryCost={recoveryCost}
            isProtected={protectionMode}
          />

          {/* E. PHYSICAL RESPONSE CHART */}
          <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-6">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Physical Reactor Telemetry
            </div>
            <TemperatureChart
              readings={sensorHistory}
              targetTemp={machineState.targetTemp}
              height={220}
            />
          </div>

          {/* F. WHAT HAPPENED NARRATIVE */}
          <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              What Happened
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              A simulated control command modified the target setting from 180°C to {csvSummary ? `${csvSummary.peakTemp}°C` : '220°C'}. Within two minutes, the measured reactor temperature responded, reaching{' '}
              <strong className="text-red-400 font-mono font-bold">{machineState.currentTemp.toFixed(1)}°C</strong> and breaching safe operating limits.
            </p>
          </div>

          {/* G. ESTIMATED FINANCIAL LOSS WITH EXPANDABLE BREAKDOWN */}
          <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Estimated Potential Financial Impact
              </h3>
              <span className="text-[11px] text-slate-400 italic">
                Illustrative simulation estimate
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-red-400 font-mono">
                <CurrencyDisplay amount={csvSummary ? csvSummary.totalCalculatedLoss : calculatedLoss.totalEstimatedLoss} />
              </span>
              <span className="text-xs text-slate-400 font-medium">potential loss at risk</span>
            </div>

            {/* Expandable Breakdown */}
            <details className="group border-t border-[#182030] pt-4">
              <summary className="text-xs font-semibold text-slate-400 cursor-pointer hover:text-white flex items-center justify-between">
                <span>View cost breakdown & simulation assumptions</span>
                <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>

              <div className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#0a0d14] rounded-lg border border-[#182030]">
                    <div className="text-slate-400 mb-1">Downtime Loss</div>
                    <div className="text-base font-bold text-white font-mono">
                      <CurrencyDisplay amount={calculatedLoss.downtimeLossTotal} />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {downtime} min @ <CurrencyDisplay amount={lossRate} />/min
                    </div>
                  </div>

                  <div className="p-3 bg-[#0a0d14] rounded-lg border border-[#182030]">
                    <div className="text-slate-400 mb-1">Wasted Material</div>
                    <div className="text-base font-bold text-white font-mono">
                      <CurrencyDisplay amount={csvSummary ? csvSummary.totalWastedCost : wastedCost} />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Thermal batch damage
                    </div>
                  </div>

                  <div className="p-3 bg-[#0a0d14] rounded-lg border border-[#182030]">
                    <div className="text-slate-400 mb-1">Recovery & Recalibration</div>
                    <div className="text-base font-bold text-white font-mono">
                      <CurrencyDisplay amount={recoveryCost} />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Safety inspection
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#0a0d14] rounded-lg border border-[#182030] space-y-3">
                  <div className="font-bold text-slate-300 text-xs">
                    Adjust Assumptions:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Downtime Duration</span>
                        <span className="font-bold text-white font-mono">{downtime} min</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="120"
                        step="5"
                        value={downtime}
                        onChange={(e) => setDowntime(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-500 h-1.5 bg-[#182030] rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Contribution Rate / min</span>
                        <span className="font-bold text-white font-mono"><CurrencyDisplay amount={lossRate} /></span>
                      </div>
                      <input
                        type="range"
                        min="2000"
                        max="20000"
                        step="500"
                        value={lossRate}
                        onChange={(e) => setLossRate(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-500 h-1.5 bg-[#182030] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* H. PROTECTION AUDIT LOG */}
          {protectionAuditLog.length > 0 && (
            <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Protection Action Audit Log
              </h3>
              <div className="space-y-2 text-xs font-mono">
                {protectionAuditLog.map((entry, idx) => (
                  <div key={idx} className="p-3 bg-[#0a0d14] rounded-lg border border-[#182030] flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-emerald-400">{entry.title}</div>
                      <div className="text-slate-300 text-[11px] mt-0.5">{entry.description}</div>
                    </div>
                    <div className="text-[10px] text-slate-500 shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* I. RECOMMENDED ACTION BAR */}
          <div className="bg-[#101522] border border-[#1b2336] rounded-xl p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Recommended Operator Action
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4">
              Isolate remote setpoint override channels, enforce 175°C–185°C certified baseline safety limits, and restore normal thermal control.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#182030]">
              <button
                onClick={onReset}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm shadow-blue-900/40"
              >
                Reset Simulation & Setpoint to 180°C
              </button>
              <button
                onClick={() => onNavigate('/dashboard')}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Return to Overview →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
