/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ABSOLUTE_MAX_TEMP,
  ABSOLUTE_MIN_TEMP,
  CORRELATION_WINDOW_MS,
  MACHINE_ID,
  NORMAL_TARGET_TEMP,
  NORMAL_TEMP_MAX,
  NORMAL_TEMP_MIN,
  SUSPICIOUS_TARGET_TEMP,
} from './constants.ts';
import type {
  ControlCommandEvent,
  IncidentAssessment,
  IncidentClassification,
  IncidentSeverity,
  SensorReading,
} from './types.ts';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: number;
}

/**
 * Validates incoming setpoint command according to industrial safety boundaries.
 */
export function validateCommandInput(targetTemp: unknown, machineId: string): ValidationResult {
  if (typeof machineId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(machineId)) {
    return { isValid: false, error: 'Invalid machine identifier format.' };
  }

  if (machineId !== MACHINE_ID) {
    return { isValid: false, error: `Unknown machine identifier: ${machineId}. Expected ${MACHINE_ID}.` };
  }

  const num = Number(targetTemp);
  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, error: 'Target temperature must be a valid finite number.' };
  }

  if (num < ABSOLUTE_MIN_TEMP || num > ABSOLUTE_MAX_TEMP) {
    return {
      isValid: false,
      error: `Target temperature ${num}°C exceeds physical reactor safety range [${ABSOLUTE_MIN_TEMP}°C, ${ABSOLUTE_MAX_TEMP}°C].`,
    };
  }

  return { isValid: true, sanitizedValue: Math.round(num * 10) / 10 };
}

/**
 * Evaluates whether a control command is suspicious based on deviation from normal operating baseline.
 */
export function isCommandSuspicious(previousSetpoint: number, newSetpoint: number): boolean {
  // A jump from normal 180°C up to 220°C (or anything > normal max limit 185°C) is flagged as suspicious
  if (newSetpoint > NORMAL_TEMP_MAX && newSetpoint >= SUSPICIOUS_TARGET_TEMP) {
    return true;
  }
  // Sudden delta > 20°C beyond normal envelope
  if (Math.abs(newSetpoint - previousSetpoint) >= 30 && newSetpoint > NORMAL_TEMP_MAX) {
    return true;
  }
  return false;
}

/**
 * Deterministic explainable Cyber-Physical Threat Correlation Engine.
 * 
 * Correlates cyber control actions with physical telemetry over the temporal correlation window:
 * 1. Checks for abnormal physical sensor readings (temp > 185°C).
 * 2. Checks for suspicious command events within the last 120s.
 * 3. Compares the temporal precedence (command occurred before or at start of physical excursion).
 * 4. Yields one of 4 deterministic scenarios:
 *    - NORMAL: Normal target & nominal physical readings.
 *    - ISOLATED_COMMAND: Suspicious command received, but thermal lag or override prevented excursion.
 *    - CYBER_PHYSICAL_ATTACK: Suspicious command directly followed by physical temperature excursion.
 *    - ISOLATED_PHYSICAL_ANOMALY: Physical sensor excursion with NO matching suspicious command.
 */
export function evaluateCyberPhysicalState(
  currentTargetTemp: number,
  currentSensorTemp: number,
  commandHistory: ControlCommandEvent[],
  sensorHistory: SensorReading[],
  currentTime: number = Date.now()
): IncidentAssessment {
  const windowStart = currentTime - CORRELATION_WINDOW_MS;

  // 1. Identify suspicious commands in the correlation window
  const recentSuspiciousCommands = commandHistory.filter(
    (cmd) => cmd.isSuspicious && cmd.timestamp >= windowStart && cmd.timestamp <= currentTime
  );
  const latestSuspiciousCmd = recentSuspiciousCommands.length > 0 
    ? recentSuspiciousCommands[recentSuspiciousCommands.length - 1] 
    : null;

  // 2. Identify abnormal physical readings in the correlation window
  const recentAbnormalReadings = sensorHistory.filter(
    (reading) => reading.isAbnormal && reading.timestamp >= windowStart && reading.timestamp <= currentTime
  );
  const isCurrentlyAbnormal = currentSensorTemp > NORMAL_TEMP_MAX || currentSensorTemp < NORMAL_TEMP_MIN;
  const hasPhysicalAbnormality = recentAbnormalReadings.length > 0 || isCurrentlyAbnormal;

  // Find peak temperature observed in the window
  const peakTemp = sensorHistory.reduce(
    (max, r) => (r.timestamp >= windowStart ? Math.max(max, r.temperature) : max),
    currentSensorTemp
  );

  let classification: IncidentClassification = 'NORMAL';
  let severity: IncidentSeverity = 'LOW';
  let correlationExplanation = 'Operating within certified parameters (175°C - 185°C). No command anomalies.';
  let recommendedAction = 'Maintain routine automated process monitoring.';

  if (latestSuspiciousCmd && hasPhysicalAbnormality) {
    // Scenario 3: Correlated Cyber-Physical Incident
    classification = 'CYBER_PHYSICAL_ATTACK';
    severity = 'CRITICAL';
    correlationExplanation = 
      `Suspicious PLC setpoint override from ${latestSuspiciousCmd.previousSetpoint}°C to ${latestSuspiciousCmd.newSetpoint}°C ` +
      `was issued, directly followed by measured physical temperature excursion reaching ${peakTemp.toFixed(1)}°C ` +
      `(exceeding safe threshold of ${NORMAL_TEMP_MAX}°C) within the 120s correlation window. ` +
      `Both cyber command evidence and physical telemetry anomaly are temporally and causally aligned.`;
    recommendedAction = 
      'Potential cyber-physical incident detected. Immediately isolate unauthorized command channel, ' +
      'halt active feed injection, initiate emergency cooling, and follow the approved industrial safety procedure.';
  } else if (latestSuspiciousCmd && !hasPhysicalAbnormality) {
    // Scenario 2: Suspicious Command Only (Thermal lag or early detection)
    classification = 'ISOLATED_COMMAND';
    severity = 'MEDIUM';
    correlationExplanation = 
      `Suspicious PLC command detected (${latestSuspiciousCmd.previousSetpoint}°C → ${latestSuspiciousCmd.newSetpoint}°C), ` +
      `but physical reactor temperature (${currentSensorTemp.toFixed(1)}°C) remains within normal bounds (${NORMAL_TEMP_MIN}°C - ${NORMAL_TEMP_MAX}°C). ` +
      `Physical thermal inertia may be delaying the sensor response.`;
    recommendedAction = 
      'Inspect unauthorized control setpoint command on PLC bus. Intercept setpoint before thermal runaway occurs.';
  } else if (!latestSuspiciousCmd && hasPhysicalAbnormality) {
    // Scenario 4: Isolated Physical Anomaly (Not a confirmed cyberattack)
    classification = 'ISOLATED_PHYSICAL_ANOMALY';
    severity = 'HIGH';
    correlationExplanation = 
      `Physical sensor temperature (${currentSensorTemp.toFixed(1)}°C) has exceeded normal limits (${NORMAL_TEMP_MIN}°C - ${NORMAL_TEMP_MAX}°C), ` +
      `but NO suspicious PLC setpoint changes were recorded in the 120s correlation window (target setpoint remains ${currentTargetTemp}°C). ` +
      `Event classified as mechanical or sensor anomaly, NOT a confirmed cyberattack.`;
    recommendedAction = 
      'Investigate cooling jacket valve, thermocouple calibration, or mechanical heating element failure.';
  } else {
    // Scenario 1: Normal
    classification = 'NORMAL';
    severity = 'LOW';
    correlationExplanation = `Reactor setpoint is nominal (${currentTargetTemp}°C). Physical telemetry confirms temperature is stable at ${currentSensorTemp.toFixed(1)}°C.`;
    recommendedAction = 'System operating nominally. No intervention required.';
  }

  const incidentId = classification === 'NORMAL' 
    ? `INC-NOMINAL-${MACHINE_ID}` 
    : `INC-${Date.now().toString(36).toUpperCase()}-${MACHINE_ID}`;

  return {
    id: incidentId,
    machineId: MACHINE_ID,
    severity,
    classification,
    commandEvidence: latestSuspiciousCmd ? {
      commandId: latestSuspiciousCmd.id,
      previousSetpoint: latestSuspiciousCmd.previousSetpoint,
      newSetpoint: latestSuspiciousCmd.newSetpoint,
      timestamp: latestSuspiciousCmd.timestamp,
      explanation: `Simulated unauthorized setpoint change to ${latestSuspiciousCmd.newSetpoint}°C via ${latestSuspiciousCmd.triggeredBy}.`,
    } : null,
    physicalEvidence: hasPhysicalAbnormality ? {
      peakObservedTemp: peakTemp,
      thresholdExceededAt: recentAbnormalReadings[0]?.timestamp ?? currentTime,
      normalOperatingRange: `${NORMAL_TEMP_MIN}°C - ${NORMAL_TEMP_MAX}°C`,
      explanation: `Observed reactor core temperature reached ${peakTemp.toFixed(1)}°C, exceeding safe upper boundary (${NORMAL_TEMP_MAX}°C).`,
    } : null,
    correlationExplanation,
    recommendedAction,
    timestamp: currentTime,
    isSimulated: true,
  };
}
