/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { ConnectionState } from '../services/simulationClient.ts';
import type { SimulationSyncPayload } from '../simulation/types.ts';

interface LayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  connectionState: ConnectionState;
  onReset: () => Promise<void>;
  onTriggerAttack: () => Promise<void>;
  simState: SimulationSyncPayload;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentRoute,
  onNavigate,
  connectionState,
  onReset,
  onTriggerAttack,
  simState,
  children,
}) => {
  const { machineState, activeIncident, protectionMode, pendingCommand } = simState;

  const isAttack = activeIncident?.classification === 'CYBER_PHYSICAL_ATTACK';
  const isAnomaly = activeIncident?.classification === 'ISOLATED_PHYSICAL_ANOMALY';
  const isWarning = machineState.status === 'WARNING' || activeIncident?.classification === 'ISOLATED_COMMAND';
  const isCritical = isAttack || isAnomaly || machineState.status === 'CRITICAL_INCIDENT';

  const navItems = [
    {
      id: '/dashboard',
      label: 'Overview',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: '/data-analysis',
      label: 'Data & Loss Analysis',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: '/incidents',
      label: 'Incidents & Protection',
      badge: isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      id: '/ai-analyst',
      label: 'AI Analyst',
      badge: 'GEMINI 2.5',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] font-sans antialiased relative overflow-hidden flex flex-col justify-center items-center p-2 sm:p-4 md:p-6 selection:bg-blue-500/30 selection:text-blue-200">
      {/* Ambient background glows - Soft blue, violet, and magenta */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Main Centered Desktop Application Window */}
      <div className="relative w-full max-w-[1440px] h-[92vh] min-h-[750px] bg-[#0c1018] border border-[#1a2336] rounded-2xl shadow-2xl shadow-blue-950/30 flex flex-col md:flex-row overflow-hidden z-10">
        
        {/* LEFT FIXED SIDEBAR */}
        <aside className="w-full md:w-64 bg-[#0a0d14] border-r border-[#171f30] flex flex-col shrink-0">
          {/* Sidebar Top Header Branding */}
          <div className="p-5 border-b border-[#171f30] flex items-center justify-between">
            <a
              href="#/dashboard"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/dashboard');
              }}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                C
              </div>
              <div>
                <div className="font-cymystic text-lg font-black tracking-wider text-white leading-none">
                  Cy<span className="text-blue-400">MYSTIC</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium tracking-wider mt-0.5 uppercase">
                  Cyber-Physical Defense
                </div>
              </div>
            </a>
          </div>

          {/* Machine Identifier Badge */}
          <div className="px-5 py-3 bg-[#0d121d] border-b border-[#171f30] flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Machine 01</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>

          {/* Primary Sidebar Navigation Menu */}
          <nav className="p-3 flex md:flex-col overflow-x-auto md:overflow-x-visible md:overflow-y-auto gap-1 flex-1 scrollbar-none">
            <div className="hidden md:block px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Navigation
            </div>
            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex-1 md:flex-none md:w-full h-10 min-h-[40px] flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131926] bg-[#0d121d] md:bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span
                      className={`ml-2 shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        isActive
                          ? 'bg-blue-800 text-blue-100'
                          : item.badge === 'CRITICAL'
                          ? 'bg-red-950 text-red-400 border border-red-800/50'
                          : item.badge === 'WARNING'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                          : 'bg-[#182030] text-blue-400 border border-blue-800/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : (
                    <span className="w-1 md:block hidden" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* VISUALLY SEPARATED PHONE SIMULATOR LINK SECTION AT BOTTOM OF SIDEBAR */}
          <div className="p-3 border-t border-[#171f30] bg-[#090b12] shrink-0">
            <div className="hidden md:block px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Simulation Trigger
            </div>
            <button
              onClick={() => onNavigate('/attacker')}
              className={`w-full h-10 min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                currentRoute === '/attacker'
                  ? 'bg-red-950/70 border-red-600/60 text-red-200 shadow-lg shadow-red-950/50'
                  : 'bg-[#111622] border-[#1f2a40] text-slate-300 hover:border-red-500/40 hover:text-white hover:bg-[#161c2b]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left truncate">
                  <span className="font-bold text-xs leading-tight">Phone Simulator</span>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
            </button>
          </div>
        </aside>

        {/* RIGHT MAIN WORKSPACE */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c1018]">
          {/* SLIM TOP STATUS BAR */}
          <header className="h-14 px-6 bg-[#0a0d14] border-b border-[#171f30] flex items-center justify-between shrink-0 gap-4">
            {/* Left: Machine & SSE Stream Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="text-slate-400 font-bold uppercase tracking-wide">Reactor 01</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 font-mono hidden sm:inline">180°C Nominal Baseline</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionState === 'CONNECTED'
                      ? 'bg-emerald-400'
                      : connectionState === 'CONNECTING'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-red-400'
                  }`}
                />
                <span>{connectionState}</span>
              </div>
            </div>

            {/* Right: Quick Controls & Status Badges */}
            <div className="flex items-center gap-3">
              {/* Protection Mode Badge */}
              <div
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
                  protectionMode
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                    : 'bg-[#141b29] text-slate-400 border border-[#222d42]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${protectionMode ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span>{protectionMode ? 'PROTECTION ACTIVE' : 'STANDARD POLICY'}</span>
              </div>

              {/* Pending Command Indicator */}
              {pendingCommand && (
                <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-600/60 text-amber-300 text-[11px] font-bold rounded animate-pulse">
                  VERIFICATION PENDING
                </span>
              )}

              {/* Quick Attack Trigger */}
              <button
                onClick={onTriggerAttack}
                className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-sm shadow-red-900/40 flex items-center gap-1.5"
              >
                <span>Simulate Attack</span>
              </button>

              {/* Reset Simulation Button */}
              <button
                onClick={onReset}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#141b29] hover:bg-[#1a2336] border border-[#222d42] rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </header>

          {/* MAIN PAGE CONTENT SCROLLABLE AREA */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
