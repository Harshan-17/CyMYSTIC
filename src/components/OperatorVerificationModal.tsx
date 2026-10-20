/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { ControlCommandEvent } from '../simulation/types.ts';

interface OperatorVerificationModalProps {
  pendingCommand: ControlCommandEvent;
  onRespond: (approved: boolean) => Promise<void>;
}

export const OperatorVerificationModal: React.FC<OperatorVerificationModalProps> = ({
  pendingCommand,
  onRespond,
}) => {
  return (
    <div className="bg-[#1a1214] border-2 border-red-800/80 rounded-xl p-5 mb-6 text-[#e6edf3] shadow-lg animate-pulse-slow">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest font-mono">
              OPERATOR VERIFICATION CHALLENGE
            </span>
          </div>
          <h3 className="text-lg font-bold text-white">
            "Is this you?" — Suspicious PLC Setpoint Request
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            A request from <strong className="text-amber-300">{pendingCommand.triggeredBy}</strong> attempted to change target setpoint from{' '}
            <strong className="text-slate-200">{pendingCommand.previousSetpoint}°C</strong> →{' '}
            <strong className="text-red-400">{pendingCommand.newSetpoint}°C</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onRespond(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors"
          >
            Yes, I requested this
          </button>
          <button
            onClick={() => onRespond(false)}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded transition-colors"
          >
            No, block this request
          </button>
        </div>
      </div>
    </div>
  );
};
