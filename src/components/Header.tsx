/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { ConnectionState } from '../services/simulationClient.ts';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  connectionState?: ConnectionState;
  onReset?: () => void;
  isResetting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
}) => {
  return (
    <header className="w-full bg-[#11141a] border-b border-[#202530] shrink-0 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <a
            href="#/dashboard"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/dashboard');
            }}
            className="flex items-center gap-2 text-white font-bold tracking-tight text-lg hover:text-slate-200 transition-colors"
          >
            <div className="w-6 h-6 bg-[#1a202c] border border-[#2d3748] rounded flex items-center justify-center text-amber-400 font-mono text-xs font-bold">
              C
            </div>
            <span className="font-cymystic font-extrabold tracking-wider text-xl text-white">
              Cy<span className="text-amber-400">MYSTIC</span>
            </span>
          </a>
          <span className="text-[11px] font-medium text-slate-400 bg-[#1a202c] px-2 py-0.5 rounded">
            Simulation
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('/dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              currentRoute === '/dashboard'
                ? 'bg-[#1e2533] text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b24]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onNavigate('/incidents')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              currentRoute === '/incidents'
                ? 'bg-[#1e2533] text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b24]'
            }`}
          >
            Incident
          </button>
          <button
            onClick={() => onNavigate('/attacker')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              currentRoute === '/attacker'
                ? 'bg-[#2a1a1a] text-red-300 font-semibold border border-red-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b24]'
            }`}
          >
            Phone Simulator
          </button>
        </nav>

      </div>
    </header>
  );
};
