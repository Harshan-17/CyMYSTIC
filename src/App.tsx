/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout.tsx';
import { DashboardScreen } from './screens/DashboardScreen.tsx';
import { DataAnalysisScreen } from './screens/DataAnalysisScreen.tsx';
import { IncidentsScreen } from './screens/IncidentsScreen.tsx';
import { AiAnalystScreen } from './screens/AiAnalystScreen.tsx';
import { AttackerScreen } from './screens/AttackerScreen.tsx';
import { simulationClient, type ConnectionState } from './services/simulationClient.ts';
import type { SimulationSyncPayload } from './simulation/types.ts';
import { MACHINE_ID, NORMAL_TARGET_TEMP, NORMAL_TEMP_MAX, NORMAL_TEMP_MIN } from './simulation/constants.ts';

// Initial fallback state while stream connects
const initialSimulationState: SimulationSyncPayload = {
  machineState: {
    id: MACHINE_ID,
    name: 'Industrial Thermal Reactor 01',
    targetTemp: NORMAL_TARGET_TEMP,
    currentTemp: NORMAL_TARGET_TEMP,
    status: 'NORMAL',
    lastUpdated: Date.now(),
    runId: 1,
  },
  latestCommand: null,
  commandHistory: [],
  sensorHistory: [
    { timestamp: Date.now() - 3000, temperature: 180.1, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: false, isSimulated: true },
    { timestamp: Date.now() - 2000, temperature: 179.9, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: false, isSimulated: true },
    { timestamp: Date.now() - 1000, temperature: 180.2, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: false, isSimulated: true },
  ],
  activeIncident: null,
  financialAssessment: null,
  protectionMode: false,
  enforceTemperatureLimits: false,
  requireOperatorVerification: false,
  pendingCommand: null,
  protectionAuditLog: [],
  incidentStartTime: null,
  csvSummary: null,
  updatedAt: Date.now(),
  source: 'LOCAL',
};

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (['/dashboard', '/data-analysis', '/incidents', '/ai-analyst', '/attacker'].includes(hash)) {
        return hash;
      }
      const path = window.location.pathname;
      if (['/dashboard', '/data-analysis', '/incidents', '/ai-analyst', '/attacker'].includes(path)) {
        return path;
      }
    }
    return '/dashboard';
  });

  const [simState, setSimState] = useState<SimulationSyncPayload>(initialSimulationState);
  const [connectionState, setConnectionState] = useState<ConnectionState>('CONNECTING');

  // Sync route changes
  const navigateTo = (route: string) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      window.location.hash = route;
    }
  };

  // Listen to browser hash changes (e.g. Back/Forward button)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['/dashboard', '/data-analysis', '/incidents', '/ai-analyst', '/attacker'].includes(hash)) {
        setCurrentRoute(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Subscribe to real-time simulation updates
  useEffect(() => {
    const unsubState = simulationClient.subscribeState((newState) => {
      setSimState(newState);
    });

    const unsubConn = simulationClient.subscribeConnection((newStatus) => {
      setConnectionState(newStatus);
    });

    return () => {
      unsubState();
      unsubConn();
    };
  }, []);

  // Handlers for simulation actions
  const handleTriggerAttack = async () => {
    const source = currentRoute === '/attacker' ? 'PHONE_ATTACKER' : 'OPERATOR_CONSOLE';
    const result = await simulationClient.triggerAttack(source);
    if (!result.success) {
      console.error('Failed to trigger simulated attack:', result.error);
    }
  };

  const handleTriggerNormal = async () => {
    const result = await simulationClient.triggerNormal();
    if (!result.success) {
      console.error('Failed to restore normal operation:', result.error);
    }
  };

  const handleReset = async () => {
    await simulationClient.resetSimulation();
  };

  return (
    <Layout
      currentRoute={currentRoute}
      onNavigate={navigateTo}
      connectionState={connectionState}
      onReset={handleReset}
      onTriggerAttack={handleTriggerAttack}
      simState={simState}
    >
      {currentRoute === '/dashboard' && (
        <DashboardScreen
          state={simState}
          onNavigate={navigateTo}
          onTriggerAttack={handleTriggerAttack}
          onTriggerNormal={handleTriggerNormal}
          onReset={handleReset}
        />
      )}

      {currentRoute === '/data-analysis' && (
        <DataAnalysisScreen
          state={simState}
          onNavigate={navigateTo}
        />
      )}

      {currentRoute === '/incidents' && (
        <IncidentsScreen
          state={simState}
          onNavigate={navigateTo}
          onReset={handleReset}
          onTriggerAttack={handleTriggerAttack}
        />
      )}

      {currentRoute === '/ai-analyst' && (
        <AiAnalystScreen
          state={simState}
          onNavigate={navigateTo}
        />
      )}

      {currentRoute === '/attacker' && (
        <AttackerScreen
          state={simState}
          onNavigate={navigateTo}
          onTriggerAttack={handleTriggerAttack}
          onTriggerNormal={handleTriggerNormal}
          onReset={handleReset}
          connectionState={connectionState}
        />
      )}
    </Layout>
  );
}
