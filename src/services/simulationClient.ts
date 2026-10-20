/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CsvAnalysisSummary, SimulationSyncPayload } from '../simulation/types.ts';
import { MACHINE_ID } from '../simulation/constants.ts';

export type ConnectionState = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

type StateListener = (state: SimulationSyncPayload) => void;
type ConnectionListener = (status: ConnectionState, errorMsg?: string | null) => void;

class SimulationClientService {
  private eventSource: EventSource | null = null;
  private stateListeners: Set<StateListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private connectionState: ConnectionState = 'CONNECTING';
  private lastKnownState: SimulationSyncPayload | null = null;
  private reconnectTimeout: any = null;
  private pollInterval: any = null;
  private lastErrorMessage: string | null = null;

  constructor() {
    this.connect();
  }

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    if (this.lastKnownState) {
      listener(this.lastKnownState);
    }
    return () => this.stateListeners.delete(listener);
  }

  public subscribeConnection(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.connectionState, this.lastErrorMessage);
    return () => this.connectionListeners.delete(listener);
  }

  private setConnection(status: ConnectionState, errorMsg?: string | null) {
    this.connectionState = status;
    this.lastErrorMessage = errorMsg ?? null;
    this.connectionListeners.forEach((fn) => fn(status, this.lastErrorMessage));
  }

  private connect() {
    if (typeof window === 'undefined') return;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setConnection('CONNECTING');

    try {
      this.eventSource = new EventSource('/api/simulation/stream');

      this.eventSource.onopen = () => {
        this.setConnection('CONNECTED');
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const payload: SimulationSyncPayload = JSON.parse(event.data);
          this.lastKnownState = payload;
          this.stateListeners.forEach((fn) => fn(payload));
          if (this.connectionState !== 'CONNECTED') {
            this.setConnection('CONNECTED');
          }
        } catch (err) {
          console.error('Failed to parse SSE simulation event:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.setConnection('DISCONNECTED', 'Stream connection interrupted. Attempting fallback sync...');
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        this.startFallbackPolling();
      };
    } catch (err) {
      this.setConnection('DISCONNECTED', 'Could not open event stream');
      this.startFallbackPolling();
    }
  }

  private startFallbackPolling() {
    if (this.pollInterval) return;

    this.fetchStateOnce();

    this.pollInterval = setInterval(() => {
      this.fetchStateOnce();
    }, 1500);

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 6000);
  }

  private async fetchStateOnce() {
    try {
      const res = await fetch('/api/simulation/state');
      if (res.ok) {
        const payload: SimulationSyncPayload = await res.json();
        this.lastKnownState = payload;
        this.stateListeners.forEach((fn) => fn(payload));
        this.setConnection('CONNECTED');
      } else {
        this.setConnection('DISCONNECTED', `Server returned status ${res.status}`);
      }
    } catch (err) {
      this.setConnection('DISCONNECTED', 'Offline: Unable to reach simulation server');
    }
  }

  public async triggerAttack(source: 'PHONE_ATTACKER' | 'OPERATOR_CONSOLE' = 'PHONE_ATTACKER'): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/simulation/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredBy: source }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.state) {
        this.lastKnownState = data.state;
        this.stateListeners.forEach((fn) => fn(data.state));
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setConnection('DISCONNECTED', `Failed to record simulated attack: ${message}`);
      return { success: false, error: message };
    }
  }

  public async triggerNormal(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/simulation/normal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredBy: 'OPERATOR_CONSOLE' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.state) {
        this.lastKnownState = data.state;
        this.stateListeners.forEach((fn) => fn(data.state));
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setConnection('DISCONNECTED', `Failed to set normal state: ${message}`);
      return { success: false, error: message };
    }
  }

  public async applyProtectionAction(actionId: string, title?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/simulation/protection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, title }),
      });

      const data = await res.json();
      if (data.state) {
        this.lastKnownState = data.state;
        this.stateListeners.forEach((fn) => fn(data.state));
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  public async verifyPendingCommand(approved: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/simulation/verify-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });

      const data = await res.json();
      if (data.state) {
        this.lastKnownState = data.state;
        this.stateListeners.forEach((fn) => fn(data.state));
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  public async submitCsvSummary(summary: CsvAnalysisSummary): Promise<{ success: boolean }> {
    try {
      const res = await fetch('/api/simulation/csv-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });
      const data = await res.json();
      if (data.state) {
        this.lastKnownState = data.state;
        this.stateListeners.forEach((fn) => fn(data.state));
      }
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  }

  public async getAiAnalysis(payload: any): Promise<any> {
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return data.analysis;
    } catch (err) {
      console.error('getAiAnalysis client error:', err);
      return null;
    }
  }

  public async askAiQuestion(question: string, stateContext: any): Promise<string> {
    try {
      const res = await fetch('/api/ai/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, stateContext }),
      });
      const data = await res.json();
      return data.answer || 'No answer available.';
    } catch (err) {
      return 'Unable to process question right now.';
    }
  }

  public async resetSimulation(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/simulation/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.state) {
        this.lastKnownState = data.state;
        this.stateListeners.forEach((fn) => fn(data.state));
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.setConnection('DISCONNECTED', `Failed to reset simulation: ${message}`);
      return { success: false, error: message };
    }
  }

  public async sendCustomCommand(targetTemp: number): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/simulation/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTemp,
          machineId: MACHINE_ID,
          triggeredBy: 'OPERATOR_CONSOLE',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || `HTTP ${res.status}` };
      }

      if (data.state) {
        this.lastKnownState = data.state;
        this.stateListeners.forEach((fn) => fn(data.state));
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}

export const simulationClient = new SimulationClientService();
