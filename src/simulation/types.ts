/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MachineStatus = 'NORMAL' | 'WARNING' | 'CRITICAL_INCIDENT' | 'PHYSICAL_ANOMALY';

export type IncidentClassification = 
  | 'NORMAL' 
  | 'ISOLATED_COMMAND' 
  | 'ISOLATED_PHYSICAL_ANOMALY' 
  | 'CYBER_PHYSICAL_ATTACK';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MachineState {
  id: string;
  name: string;
  targetTemp: number; // in Celsius (°C)
  currentTemp: number; // in Celsius (°C)
  status: MachineStatus;
  lastUpdated: number; // epoch ms
  runId: number; // monotonic run/cycle counter to invalidate stale timers
}

export interface ControlCommandEvent {
  id: string;
  machineId: string;
  previousSetpoint: number;
  newSetpoint: number;
  timestamp: number;
  isSuspicious: boolean;
  isSimulated: true;
  triggeredBy: string; // 'PHONE_ATTACKER' | 'OPERATOR_CONSOLE' | 'SIMULATION_RESET'
  reason: string;
  status?: 'PENDING' | 'ACCEPTED' | 'BLOCKED_BY_POLICY' | 'REJECTED_BY_OPERATOR';
}

export interface SensorReading {
  timestamp: number;
  temperature: number;
  normalMin: number;
  normalMax: number;
  isAbnormal: boolean;
  isSimulated: true;
}

export interface IncidentAssessment {
  id: string;
  machineId: string;
  severity: IncidentSeverity;
  classification: IncidentClassification;
  commandEvidence: {
    commandId?: string;
    previousSetpoint: number;
    newSetpoint: number;
    timestamp: number;
    explanation: string;
  } | null;
  physicalEvidence: {
    peakObservedTemp: number;
    thresholdExceededAt: number;
    normalOperatingRange: string;
    explanation: string;
  } | null;
  correlationExplanation: string;
  recommendedAction: string;
  timestamp: number;
  isSimulated: true;
}

export interface FinancialInputs {
  downtimeMinutes: number;
  lossPerMinute: number; // in INR
  wastedMaterialCost: number; // in INR
  recoveryCost: number; // in INR
}

export interface FinancialAssessment {
  downtimeMinutes: number;
  lossPerMinute: number;
  downtimeLossTotal: number;
  wastedMaterialCost: number;
  recoveryCost: number;
  totalEstimatedLoss: number;
  currency: 'INR';
  formula: string;
  assumptions: {
    productionRateDesc: string;
    downtimeDesc: string;
    wasteDesc: string;
    recoveryDesc: string;
  };
  disclaimer: string;
}

export interface ProtectionAuditEntry {
  timestamp: number;
  actionId: string;
  title: string;
  outcome: 'APPLIED' | 'REJECTED' | 'BLOCKED' | 'FAILED';
  description: string;
}

export interface CsvAnalysisSummary {
  filename: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  machineId: string;
  avgTemp: number;
  peakTemp: number;
  downtimeMinutes: number;
  totalWastedCost: number;
  totalCalculatedLoss: number;
  anomalyCount: number;
  eventTypes: string[];
  rows: Array<{
    timestamp: string;
    machineId: string;
    targetTemp: number;
    measuredTemp: number;
    status: string;
    downtimeMin: number;
    wastedCost: number;
    eventType: string;
  }>;
}

export interface SimulationSyncPayload {
  machineState: MachineState;
  latestCommand: ControlCommandEvent | null;
  commandHistory: ControlCommandEvent[];
  sensorHistory: SensorReading[];
  activeIncident: IncidentAssessment | null;
  financialAssessment: FinancialAssessment | null;
  protectionMode: boolean;
  enforceTemperatureLimits: boolean;
  requireOperatorVerification: boolean;
  pendingCommand: ControlCommandEvent | null;
  protectionAuditLog: ProtectionAuditEntry[];
  incidentStartTime: number | null;
  csvSummary: CsvAnalysisSummary | null;
  updatedAt: number;
  source: 'LOCAL' | 'SERVER' | 'FIRESTORE';
}
