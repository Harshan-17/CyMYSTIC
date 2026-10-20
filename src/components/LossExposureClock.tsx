/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CurrencyDisplay } from './CurrencyDisplay.tsx';

interface LossExposureClockProps {
  isIncidentActive: boolean;
  incidentStartTime: number | null;
  baseLossPerMinute?: number; // e.g. 8500
  baseWastedCost?: number;    // e.g. 245000
  baseRecoveryCost?: number;  // e.g. 65000
  isProtected?: boolean;
}

export const LossExposureClock: React.FC<LossExposureClockProps> = ({
  isIncidentActive,
  incidentStartTime,
  baseLossPerMinute = 8500,
  baseWastedCost = 245000,
  baseRecoveryCost = 65000,
  isProtected = false,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(isIncidentActive ? 1800 : 0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isIncidentActive || isPaused || isProtected) return;

    // Use actual elapsed time if incidentStartTime exists
    if (incidentStartTime) {
      const calcElapsed = Math.max(1, Math.floor((Date.now() - incidentStartTime) / 1000));
      setElapsedSeconds(calcElapsed + 1200); // add baseline offset for demo
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isIncidentActive, isPaused, isProtected, incidentStartTime]);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const secondsRemainder = elapsedSeconds % 60;
  const formattedTimer = `${String(elapsedMinutes).padStart(2, '0')}:${String(secondsRemainder).padStart(2, '0')}`;

  // Rate per second = ratePerMin / 60
  const downtimeLoss = Math.round((elapsedSeconds / 60) * baseLossPerMinute);
  const totalExposure = downtimeLoss + baseWastedCost + baseRecoveryCost;

  return (
    <div className="bg-[#121620] border border-[#202738] rounded-xl p-5 mb-6 text-[#e6edf3] relative overflow-hidden">
      {/* Top Banner Label */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2536] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-xs font-extrabold uppercase tracking-widest text-red-400 font-mono">
            CYMYSTIC Loss Exposure Clock
          </span>
        </div>

        <div className="text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-0.5 rounded uppercase tracking-wider">
          SIMULATED FINANCIAL EXPOSURE — ESTIMATE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Main Ticker Figure */}
        <div className="md:col-span-2">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
            Accumulating Financial Risk
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-red-400 font-mono tracking-tight flex items-baseline gap-2">
            <CurrencyDisplay amount={totalExposure} />
            {isIncidentActive && !isProtected && !isPaused && (
              <span className="text-xs font-normal text-red-400/80 animate-pulse">
                (+₹142/sec)
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div>Downtime Loss: <span className="text-white font-semibold"><CurrencyDisplay amount={downtimeLoss} /></span></div>
            <div>Wasted Material: <span className="text-white font-semibold"><CurrencyDisplay amount={baseWastedCost} /></span></div>
            <div>Recovery: <span className="text-white font-semibold"><CurrencyDisplay amount={baseRecoveryCost} /></span></div>
          </div>
        </div>

        {/* Incident Timer Control */}
        <div className="bg-[#181e2b] border border-[#263147] rounded-lg p-3.5 text-center flex flex-col items-center justify-center">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">
            Simulated Incident Timer
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono tracking-wider my-0.5">
            {formattedTimer}
          </div>
          <div className="text-[11px] text-slate-400 mb-2">
            Rate: <CurrencyDisplay amount={baseLossPerMinute} /> / min
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-200 bg-[#232d3f] hover:bg-[#2c384e] rounded transition-colors"
            >
              {isPaused ? 'Resume Clock' : 'Pause Clock'}
            </button>
            <button
              onClick={() => setElapsedSeconds(0)}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Reset Clock
            </button>
          </div>
        </div>
      </div>

      {isProtected && (
        <div className="mt-4 p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded text-xs text-emerald-300 flex items-center gap-2">
          <span>✓</span>
          <span>CYMYSTIC Protection Mode Active — Loss accumulation stopped by policy.</span>
        </div>
      )}
    </div>
  );
};
