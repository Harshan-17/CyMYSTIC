/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_DOWNTIME_MINUTES,
  DEFAULT_LOSS_PER_MINUTE,
  DEFAULT_RECOVERY_COST,
  DEFAULT_WASTED_MATERIAL,
  INITIAL_SENSOR_HISTORY_COUNT,
  MACHINE_ID,
  MACHINE_NAME,
  NORMAL_TARGET_TEMP,
  NORMAL_TEMP_MAX,
  NORMAL_TEMP_MIN,
  SUSPICIOUS_TARGET_TEMP,
} from './constants.ts';
import {
  evaluateCyberPhysicalState,
  isCommandSuspicious,
  validateCommandInput,
} from './detection.ts';
import { calculateFinancialLoss } from './financial.ts';
import type {
  ControlCommandEvent,
  CsvAnalysisSummary,
  FinancialAssessment,
  IncidentAssessment,
  MachineState,
  MachineStatus,
  ProtectionAuditEntry,
  SensorReading,
  SimulationSyncPayload,
} from './types.ts';

export class SimulationEngine {
  private machineState: MachineState;
  private commandHistory: ControlCommandEvent[] = [];
  private sensorHistory: SensorReading[] = [];
  private activeIncident: IncidentAssessment | null = null;
  private financialAssessment: FinancialAssessment | null = null;
  
  // Protection & Policy State
  private protectionMode = false;
  private enforceTemperatureLimits = false;
  private requireOperatorVerification = false;
  private pendingCommand: ControlCommandEvent | null = null;
  private protectionAuditLog: ProtectionAuditEntry[] = [];
  private incidentStartTime: number | null = null;
  private csvSummary: CsvAnalysisSummary | null = null;

  private runId = 1;
  private simulationInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(state: SimulationSyncPayload) => void> = new Set();

  constructor() {
    const now = Date.now();
    this.machineState = {
      id: MACHINE_ID,
      name: MACHINE_NAME,
      targetTemp: NORMAL_TARGET_TEMP,
      currentTemp: NORMAL_TARGET_TEMP,
      status: 'NORMAL',
      lastUpdated: now,
      runId: this.runId,
    };

    // Seed initial nominal sensor history
    for (let i = INITIAL_SENSOR_HISTORY_COUNT; i >= 0; i--) {
      const t = now - i * 1500;
      const jitter = (Math.sin(i) * 0.3);
      this.sensorHistory.push({
        timestamp: t,
        temperature: Math.round((NORMAL_TARGET_TEMP + jitter) * 10) / 10,
        normalMin: NORMAL_TEMP_MIN,
        normalMax: NORMAL_TEMP_MAX,
        isAbnormal: false,
        isSimulated: true,
      });
    }

    this.startSimulationLoop();
  }

  public subscribe(listener: (state: SimulationSyncPayload) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Simulation listener notification error:', err);
      }
    });
  }

  public getState(): SimulationSyncPayload {
    const latestCommand = this.commandHistory.length > 0 
      ? this.commandHistory[this.commandHistory.length - 1] 
      : null;

    return {
      machineState: { ...this.machineState },
      latestCommand,
      commandHistory: [...this.commandHistory],
      sensorHistory: [...this.sensorHistory],
      activeIncident: this.activeIncident ? { ...this.activeIncident } : null,
      financialAssessment: this.financialAssessment ? { ...this.financialAssessment } : null,
      protectionMode: this.protectionMode,
      enforceTemperatureLimits: this.enforceTemperatureLimits,
      requireOperatorVerification: this.requireOperatorVerification,
      pendingCommand: this.pendingCommand ? { ...this.pendingCommand } : null,
      protectionAuditLog: [...this.protectionAuditLog],
      incidentStartTime: this.incidentStartTime,
      csvSummary: this.csvSummary ? { ...this.csvSummary } : null,
      updatedAt: Date.now(),
      source: 'SERVER',
    };
  }

  private startSimulationLoop() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }

    this.simulationInterval = setInterval(() => {
      this.tick();
    }, 1000);
    if (this.simulationInterval && typeof (this.simulationInterval as any).unref === 'function') {
      (this.simulationInterval as any).unref();
    }
  }

  private tick() {
    const now = Date.now();
    const target = this.machineState.targetTemp;
    let current = this.machineState.currentTemp;

    // Simulate physical thermodynamics
    if (Math.abs(target - current) > 0.4) {
      const rate = target > current ? 3.2 : 2.5;
      const delta = (target - current) * 0.28;
      const step = Math.sign(delta) * Math.min(Math.abs(delta), rate);
      current = Math.round((current + step + (Math.random() - 0.5) * 0.4) * 10) / 10;
    } else {
      const noise = (Math.sin(now / 2000) * 0.25) + ((Math.random() - 0.5) * 0.2);
      current = Math.round((target + noise) * 10) / 10;
    }

    this.machineState.currentTemp = current;
    this.machineState.lastUpdated = now;

    const isAbnormal = current > NORMAL_TEMP_MAX || current < NORMAL_TEMP_MIN;

    this.sensorHistory.push({
      timestamp: now,
      temperature: current,
      normalMin: NORMAL_TEMP_MIN,
      normalMax: NORMAL_TEMP_MAX,
      isAbnormal,
      isSimulated: true,
    });

    if (this.sensorHistory.length > 50) {
      this.sensorHistory.shift();
    }

    const assessment = evaluateCyberPhysicalState(
      target,
      current,
      this.commandHistory,
      this.sensorHistory,
      now
    );

    let newStatus: MachineStatus = 'NORMAL';
    if (assessment.classification === 'CYBER_PHYSICAL_ATTACK') {
      newStatus = 'CRITICAL_INCIDENT';
      if (!this.incidentStartTime) {
        this.incidentStartTime = now;
      }
    } else if (assessment.classification === 'ISOLATED_PHYSICAL_ANOMALY') {
      newStatus = 'PHYSICAL_ANOMALY';
    } else if (assessment.classification === 'ISOLATED_COMMAND') {
      newStatus = 'WARNING';
      if (!this.incidentStartTime) {
        this.incidentStartTime = now;
      }
    } else if (isAbnormal) {
      newStatus = 'WARNING';
    }

    this.machineState.status = newStatus;

    if (assessment.classification === 'NORMAL') {
      this.activeIncident = null;
      this.financialAssessment = null;
      this.incidentStartTime = null;
    } else {
      this.activeIncident = assessment;
      // Real-time financial assessment calculation
      const elapsedMins = this.incidentStartTime ? Math.max(1, Math.round((now - this.incidentStartTime) / 60000)) : DEFAULT_DOWNTIME_MINUTES;
      this.financialAssessment = calculateFinancialLoss({
        downtimeMinutes: elapsedMins,
        lossPerMinute: DEFAULT_LOSS_PER_MINUTE,
        wastedMaterialCost: DEFAULT_WASTED_MATERIAL,
        recoveryCost: DEFAULT_RECOVERY_COST,
      });
    }

    this.notify();
  }

  /**
   * Triggers or processes simulated command with Protection Mode & Verification checks
   */
  public triggerAttack(triggeredBy: 'PHONE_ATTACKER' | 'OPERATOR_CONSOLE' = 'PHONE_ATTACKER'): SimulationSyncPayload {
    return this.processSetpointChange(SUSPICIOUS_TARGET_TEMP, triggeredBy, 'Simulated unauthorized setpoint change 180°C -> 220°C');
  }

  public triggerNormal(triggeredBy: string = 'OPERATOR_CONSOLE'): SimulationSyncPayload {
    return this.processSetpointChange(NORMAL_TARGET_TEMP, triggeredBy, 'Setpoint restored to safe nominal baseline 180°C');
  }

  private processSetpointChange(newTarget: number, triggeredBy: string, defaultReason: string): SimulationSyncPayload {
    const prevTarget = this.machineState.targetTemp;
    const now = Date.now();
    const isSuspicious = isCommandSuspicious(prevTarget, newTarget);

    const cmd: ControlCommandEvent = {
      id: `CMD-${now.toString(36).toUpperCase()}`,
      machineId: MACHINE_ID,
      previousSetpoint: prevTarget,
      newSetpoint: newTarget,
      timestamp: now,
      isSuspicious,
      isSimulated: true,
      triggeredBy,
      reason: defaultReason,
      status: 'PENDING',
    };

    // CHECK 1: Protection Mode or Strict Limits
    if (this.protectionMode || (this.enforceTemperatureLimits && newTarget > NORMAL_TEMP_MAX)) {
      cmd.status = 'BLOCKED_BY_POLICY';
      this.commandHistory.push(cmd);
      
      this.protectionAuditLog.unshift({
        timestamp: now,
        actionId: 'BLOCK_ATTACK',
        title: 'CYMYSTIC Protection Blocked Command',
        outcome: 'BLOCKED',
        description: `Blocked setpoint change to ${newTarget}°C from ${triggeredBy}. Certified limit: ${NORMAL_TEMP_MAX}°C. Target setpoint remains safe at ${NORMAL_TARGET_TEMP}°C.`,
      });

      this.tick();
      return this.getState();
    }

    // CHECK 2: Require Operator Verification ("Is this you?")
    if (this.requireOperatorVerification && isSuspicious) {
      this.pendingCommand = { ...cmd, status: 'PENDING' };
      this.notify();
      return this.getState();
    }

    // Accepted directly
    cmd.status = 'ACCEPTED';
    this.commandHistory.push(cmd);
    this.machineState.targetTemp = newTarget;
    this.machineState.lastUpdated = now;

    this.tick();
    return this.getState();
  }

  /**
   * Responds to pending "Is this you?" operator verification
   */
  public respondToPendingCommand(approved: boolean): SimulationSyncPayload {
    if (!this.pendingCommand) {
      return this.getState();
    }

    const cmd = { ...this.pendingCommand };
    const now = Date.now();

    if (!approved) {
      cmd.status = 'REJECTED_BY_OPERATOR';
      this.commandHistory.push(cmd);
      this.protectionAuditLog.unshift({
        timestamp: now,
        actionId: 'OPERATOR_REJECT',
        title: 'Operator Rejected Command',
        outcome: 'REJECTED',
        description: `Operator blocked suspicious setpoint request (${cmd.previousSetpoint}°C → ${cmd.newSetpoint}°C) via Verification Challenge.`,
      });
      this.pendingCommand = null;
      this.notify();
      return this.getState();
    }

    // Operator approved request, but check if limits are enforced
    if (this.enforceTemperatureLimits && cmd.newSetpoint > NORMAL_TEMP_MAX) {
      cmd.status = 'BLOCKED_BY_POLICY';
      this.commandHistory.push(cmd);
      this.protectionAuditLog.unshift({
        timestamp: now,
        actionId: 'POLICY_OVERRIDE_BLOCK',
        title: 'Policy Blocked Confirmed Request',
        outcome: 'BLOCKED',
        description: `Operator confirmed request, but CYMYSTIC Safety Limits blocked setpoint ${cmd.newSetpoint}°C exceeding max certified threshold ${NORMAL_TEMP_MAX}°C.`,
      });
      this.pendingCommand = null;
      this.notify();
      return this.getState();
    }

    // Request accepted
    cmd.status = 'ACCEPTED';
    this.commandHistory.push(cmd);
    this.machineState.targetTemp = cmd.newSetpoint;
    this.machineState.lastUpdated = now;
    this.pendingCommand = null;

    this.tick();
    return this.getState();
  }

  /**
   * Applies operator-approved protection action
   */
  public applyProtectionAction(actionId: string, title?: string): SimulationSyncPayload {
    const now = Date.now();

    if (actionId === 'ENABLE_PROTECTION_MODE' || actionId === 'ENABLE_PROTECTION') {
      this.protectionMode = true;
      this.enforceTemperatureLimits = true;
      this.requireOperatorVerification = true;
      
      // Auto-cool reactor if currently elevated
      if (this.machineState.targetTemp > NORMAL_TEMP_MAX) {
        this.machineState.targetTemp = NORMAL_TARGET_TEMP;
      }
      this.pendingCommand = null;

      this.protectionAuditLog.unshift({
        timestamp: now,
        actionId,
        title: title || 'Protection Mode Enabled',
        outcome: 'APPLIED',
        description: 'CYMYSTIC Protection Engine activated. Automated setpoint limits (175°C - 185°C) and operator verification challenges are active.',
      });
    } else if (actionId === 'ENFORCE_TEMP_LIMITS') {
      this.enforceTemperatureLimits = true;
      if (this.machineState.targetTemp > NORMAL_TEMP_MAX) {
        this.machineState.targetTemp = NORMAL_TARGET_TEMP;
      }
      this.protectionAuditLog.unshift({
        timestamp: now,
        actionId,
        title: 'Operating Temperature Limits Enforced',
        outcome: 'APPLIED',
        description: 'Enforced certified thermal boundaries (175°C - 185°C). Out-of-bounds setpoint overrides will be blocked.',
      });
    } else if (actionId === 'REQUIRE_VERIFICATION') {
      this.requireOperatorVerification = true;
      this.protectionAuditLog.unshift({
        timestamp: now,
        actionId,
        title: 'Operator Verification Challenge Enabled',
        outcome: 'APPLIED',
        description: 'Suspicious PLC commands now require explicit operator confirmation before execution.',
      });
    } else if (actionId === 'RESTORE_SAFE_BASELINE') {
      this.machineState.targetTemp = NORMAL_TARGET_TEMP;
      this.pendingCommand = null;
      this.protectionAuditLog.unshift({
        timestamp: now,
        actionId,
        title: 'Safe Baseline Restored',
        outcome: 'APPLIED',
        description: 'Setpoint restored to 180°C. Emergency cooling active.',
      });
    } else if (actionId === 'DISABLE_PROTECTION') {
      this.protectionMode = false;
      this.enforceTemperatureLimits = false;
      this.requireOperatorVerification = false;
      this.protectionAuditLog.unshift({
        timestamp: now,
        actionId,
        title: 'Protection Mode Standby',
        outcome: 'APPLIED',
        description: 'Protection policies set to passive monitoring mode.',
      });
    }

    this.tick();
    return this.getState();
  }

  public setCsvSummary(summary: CsvAnalysisSummary | null) {
    this.csvSummary = summary;
    this.notify();
  }

  public resetSimulation(): SimulationSyncPayload {
    this.runId += 1;
    const now = Date.now();

    this.machineState = {
      id: MACHINE_ID,
      name: MACHINE_NAME,
      targetTemp: NORMAL_TARGET_TEMP,
      currentTemp: NORMAL_TARGET_TEMP,
      status: 'NORMAL',
      lastUpdated: now,
      runId: this.runId,
    };

    this.commandHistory = [];
    this.activeIncident = null;
    this.financialAssessment = null;
    this.pendingCommand = null;
    this.incidentStartTime = null;

    this.sensorHistory = [];
    for (let i = INITIAL_SENSOR_HISTORY_COUNT; i >= 0; i--) {
      const t = now - i * 1500;
      const jitter = Math.sin(i) * 0.3;
      this.sensorHistory.push({
        timestamp: t,
        temperature: Math.round((NORMAL_TARGET_TEMP + jitter) * 10) / 10,
        normalMin: NORMAL_TEMP_MIN,
        normalMax: NORMAL_TEMP_MAX,
        isAbnormal: false,
        isSimulated: true,
      });
    }

    this.notify();
    return this.getState();
  }

  public setCustomCommand(targetTemp: unknown, machineId: string, triggeredBy: string): { success: boolean; error?: string; state?: SimulationSyncPayload } {
    const validation = validateCommandInput(targetTemp, machineId);
    if (!validation.isValid || validation.sanitizedValue === undefined) {
      return { success: false, error: validation.error };
    }

    const state = this.processSetpointChange(validation.sanitizedValue, triggeredBy, `Manual setpoint submission: ${validation.sanitizedValue}°C`);
    return { success: true, state };
  }

  public destroy() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.listeners.clear();
  }
}

export const globalSimulationEngine = new SimulationEngine();
