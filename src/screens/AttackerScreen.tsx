/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { SimulationSyncPayload } from '../simulation/types.ts';
import { SUSPICIOUS_TARGET_TEMP } from '../simulation/constants.ts';
import type { ConnectionState } from '../services/simulationClient.ts';

interface AttackerScreenProps {
  state: SimulationSyncPayload;
  onNavigate: (route: string) => void;
  onTriggerAttack: () => Promise<void>;
  onTriggerNormal: () => Promise<void>;
  onReset: () => Promise<void>;
  connectionState: ConnectionState;
}

export const AttackerScreen: React.FC<AttackerScreenProps> = ({
  state,
  onNavigate,
  onTriggerAttack,
  onTriggerNormal,
  onReset,
  connectionState,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { machineState, protectionMode, pendingCommand, latestCommand } = state;
  const isAttackActive = machineState.targetTemp === SUSPICIOUS_TARGET_TEMP;
  const isBlocked = latestCommand?.status === 'BLOCKED_BY_POLICY';
  const isPending = !!pendingCommand;

  const handleAction = async (action: () => Promise<void>, message: string) => {
    setIsSubmitting(true);
    try {
      await action();
      setFeedback(message);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback(`Failed: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#182030] pb-4 mb-6">
        <div>
          <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-0.5">
            Cross-Device Remote Simulation
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Phone Controller & Attack Trigger
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-[#101522] border border-[#1b2336] px-3 py-1.5 rounded-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionState === 'CONNECTED' ? 'bg-emerald-400' : 'bg-red-400'
            }`}
          />
          <span>{connectionState}</span>
        </div>
      </div>

      {/* Styled Phone Frame Mockup Container */}
      <div className="max-w-md mx-auto bg-[#090c14] border-2 border-[#1f2a40] rounded-[32px] p-6 shadow-2xl shadow-red-950/20 space-y-5 relative">
        {/* Phone Speaker Notch */}
        <div className="w-24 h-4 bg-[#141c2c] rounded-full mx-auto mb-2 flex items-center justify-center">
          <div className="w-10 h-1 bg-[#263550] rounded-full" />
        </div>

        {/* Header inside Phone */}
        <div className="bg-[#121826] border border-[#1e2a42] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-slate-300 font-mono">MACHINE-01 PLC</span>
            <span className="text-[11px] text-blue-400 font-semibold">REMOTE SESSION</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-2.5 bg-[#0a0e1a] rounded-xl border border-[#172033]">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Current Target</div>
              <div
                className={`text-xl font-extrabold font-mono ${
                  isAttackActive ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {machineState.targetTemp}°C
              </div>
            </div>

            <div className="p-2.5 bg-[#0a0e1a] rounded-xl border border-[#172033]">
              <div className="text-[10px] text-slate-400 font-medium uppercase">Measured Temp</div>
              <div className="text-xl font-extrabold font-mono text-white">
                {machineState.currentTemp.toFixed(1)}°C
              </div>
            </div>
          </div>

          {/* Protection / Status Banners */}
          {protectionMode && (
            <div className="text-[11px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 p-2 rounded-xl text-center">
              ✓ Protection Active (Enforcing 175°–185°C)
            </div>
          )}

          {isPending && (
            <div className="text-[11px] font-bold text-amber-300 bg-amber-950/70 border border-amber-600/60 p-2 rounded-xl text-center animate-pulse">
              ⏳ Pending Operator Verification Challenge...
            </div>
          )}

          {isBlocked && (
            <div className="text-[11px] font-bold text-red-300 bg-red-950/70 border border-red-700/60 p-2 rounded-xl text-center">
              🚫 Command Blocked by Safety Policy (220°C Limit Exceeded)
            </div>
          )}
        </div>

        {/* Feedback Alert Message */}
        {feedback && (
          <div className="p-3 bg-blue-950/80 border border-blue-700/60 rounded-xl text-xs text-blue-200 text-center font-bold">
            {feedback}
          </div>
        )}

        {/* Action Trigger Buttons inside Phone */}
        <div className="space-y-3">
          {/* Simulate Attack Trigger */}
          <button
            onClick={() =>
              handleAction(
                onTriggerAttack,
                protectionMode
                  ? 'Command Submitted (Blocked by Protection Policy)'
                  : 'Simulated Attack Triggered: Target Setpoint → 220°C'
              )
            }
            disabled={isSubmitting}
            className={`w-full py-4 px-4 rounded-2xl font-extrabold text-sm tracking-wide transition-all shadow-xl flex flex-col items-center justify-center gap-0.5 ${
              isAttackActive
                ? 'bg-red-600 text-white ring-2 ring-red-400 shadow-red-900/50'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40'
            } disabled:opacity-60 active:scale-[0.98]`}
          >
            <span>Simulate Attack (180°C → 220°C)</span>
            <span className="text-[11px] font-normal text-red-200">
              Sends remote setpoint override command
            </span>
          </button>

          {/* Restore Normal Operation */}
          <button
            onClick={() => handleAction(onTriggerNormal, 'Restored Baseline: Target Setpoint → 180°C')}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 hover:bg-emerald-900/60 transition-colors active:scale-[0.98]"
          >
            Restore Normal Operation (180°C)
          </button>

          {/* Reset Simulation */}
          <button
            onClick={() => handleAction(onReset, 'Simulation Reset to Nominal Parameters')}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-2xl font-bold text-xs text-slate-300 bg-[#121826] border border-[#202d42] hover:bg-[#1a2438] transition-colors active:scale-[0.98]"
          >
            Reset Simulation State
          </button>
        </div>

        {/* Quick Navigation Footer inside Phone */}
        <div className="pt-2 flex gap-2 text-xs">
          <button
            onClick={() => onNavigate('/dashboard')}
            className="flex-1 py-2 text-slate-400 hover:text-white bg-[#121826] border border-[#202d42] rounded-xl text-center font-semibold"
          >
            Overview →
          </button>
          <button
            onClick={() => onNavigate('/incidents')}
            className="flex-1 py-2 text-slate-400 hover:text-white bg-[#121826] border border-[#202d42] rounded-xl text-center font-semibold"
          >
            Incidents →
          </button>
        </div>
      </div>
    </div>
  );
};
