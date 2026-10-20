/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCyberPhysicalState,
  isCommandSuspicious,
  validateCommandInput,
} from './detection.ts';
import { SimulationEngine } from './engine.ts';
import { calculateFinancialLoss, formatINR } from './financial.ts';
import {
  MACHINE_ID,
  NORMAL_TARGET_TEMP,
  NORMAL_TEMP_MAX,
  NORMAL_TEMP_MIN,
  SUSPICIOUS_TARGET_TEMP,
} from './constants.ts';
import type { ControlCommandEvent, SensorReading } from './types.ts';

test('Financial loss calculation: exact arithmetic verification', () => {
  const result = calculateFinancialLoss({
    downtimeMinutes: 45,
    lossPerMinute: 8500,
    wastedMaterialCost: 245000,
    recoveryCost: 65000,
  });

  assert.equal(result.downtimeLossTotal, 382500);
  assert.equal(result.totalEstimatedLoss, 692500);
  assert.equal(result.currency, 'INR');
  assert.ok(result.formula.includes('45 min'));
});

test('Financial loss calculation: handles zero and guards against negative inputs', () => {
  const result = calculateFinancialLoss({
    downtimeMinutes: -10,
    lossPerMinute: -500,
    wastedMaterialCost: 0,
    recoveryCost: 0,
  });

  assert.equal(result.downtimeMinutes, 0);
  assert.equal(result.lossPerMinute, 0);
  assert.equal(result.totalEstimatedLoss, 0);
});

test('INR formatting produces standard Indian rupee representation', () => {
  const formatted = formatINR(692500);
  assert.ok(formatted.includes('6,92,500') || formatted.includes('692,500'));
  assert.ok(formatted.includes('₹'));
});

test('Input validation: allows safe operating setpoints and enforces constraints', () => {
  const validNormal = validateCommandInput(180, MACHINE_ID);
  assert.equal(validNormal.isValid, true);
  assert.equal(validNormal.sanitizedValue, 180);

  const validSuspicious = validateCommandInput(220, MACHINE_ID);
  assert.equal(validSuspicious.isValid, true);
  assert.equal(validSuspicious.sanitizedValue, 220);

  const tooHot = validateCommandInput(450, MACHINE_ID);
  assert.equal(tooHot.isValid, false);
  assert.ok(tooHot.error?.includes('exceeds physical reactor safety range'));

  const tooCold = validateCommandInput(-50, MACHINE_ID);
  assert.equal(tooCold.isValid, false);

  const nonNum = validateCommandInput('DROP TABLE;--', MACHINE_ID);
  assert.equal(nonNum.isValid, false);

  const wrongMachine = validateCommandInput(180, 'MACHINE-99');
  assert.equal(wrongMachine.isValid, false);
  assert.ok(wrongMachine.error?.includes('Unknown machine identifier'));
});

test('Command suspicion detection: flags unauthorized jump from 180°C to 220°C', () => {
  assert.equal(isCommandSuspicious(180, 220), true);
  assert.equal(isCommandSuspicious(180, 180), false);
  assert.equal(isCommandSuspicious(180, 182), false);
});

test('Scenario 1: Normal Operation produces NORMAL classification and LOW severity', () => {
  const now = Date.now();
  const assessment = evaluateCyberPhysicalState(
    NORMAL_TARGET_TEMP,
    180.2,
    [],
    [
      { timestamp: now - 5000, temperature: 180.0, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: false, isSimulated: true },
      { timestamp: now, temperature: 180.2, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: false, isSimulated: true },
    ],
    now
  );

  assert.equal(assessment.classification, 'NORMAL');
  assert.equal(assessment.severity, 'LOW');
  assert.equal(assessment.commandEvidence, null);
  assert.equal(assessment.physicalEvidence, null);
});

test('Scenario 2: Suspicious command alone produces ISOLATED_COMMAND with MEDIUM severity', () => {
  const now = Date.now();
  const suspiciousCmd: ControlCommandEvent = {
    id: 'cmd-test-1',
    machineId: MACHINE_ID,
    previousSetpoint: 180,
    newSetpoint: 220,
    timestamp: now - 2000,
    isSuspicious: true,
    isSimulated: true,
    triggeredBy: 'PHONE_ATTACKER',
    reason: 'Simulated unauthorized jump 180°C -> 220°C',
  };

  const assessment = evaluateCyberPhysicalState(
    SUSPICIOUS_TARGET_TEMP,
    180.5,
    [suspiciousCmd],
    [
      { timestamp: now - 1000, temperature: 180.5, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: false, isSimulated: true },
    ],
    now
  );

  assert.equal(assessment.classification, 'ISOLATED_COMMAND');
  assert.equal(assessment.severity, 'MEDIUM');
  assert.notEqual(assessment.commandEvidence, null);
  assert.equal(assessment.physicalEvidence, null);
});

test('Scenario 3: Suspicious command + Physical temperature excursion produces CYBER_PHYSICAL_ATTACK', () => {
  const now = Date.now();
  const suspiciousCmd: ControlCommandEvent = {
    id: 'cmd-attack-1',
    machineId: MACHINE_ID,
    previousSetpoint: 180,
    newSetpoint: 220,
    timestamp: now - 10000,
    isSuspicious: true,
    isSimulated: true,
    triggeredBy: 'PHONE_ATTACKER',
    reason: 'Simulated unauthorized setpoint change to 220°C',
  };

  const sensorReadings: SensorReading[] = [
    { timestamp: now - 12000, temperature: 180.1, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: false, isSimulated: true },
    { timestamp: now - 8000, temperature: 195.4, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: true, isSimulated: true },
    { timestamp: now, temperature: 218.6, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: true, isSimulated: true },
  ];

  const assessment = evaluateCyberPhysicalState(
    220,
    218.6,
    [suspiciousCmd],
    sensorReadings,
    now
  );

  assert.equal(assessment.classification, 'CYBER_PHYSICAL_ATTACK');
  assert.equal(assessment.severity, 'CRITICAL');
  assert.notEqual(assessment.commandEvidence, null);
  assert.notEqual(assessment.physicalEvidence, null);
  assert.ok(assessment.correlationExplanation.includes('Suspicious PLC setpoint override'));
  assert.ok(assessment.recommendedAction.includes('Potential cyber-physical incident detected'));
});

test('Scenario 4: Physical abnormality WITHOUT command is NOT classified as a cyberattack', () => {
  const now = Date.now();
  const normalCmd: ControlCommandEvent = {
    id: 'cmd-norm-1',
    machineId: MACHINE_ID,
    previousSetpoint: 180,
    newSetpoint: 180,
    timestamp: now - 60000,
    isSuspicious: false,
    isSimulated: true,
    triggeredBy: 'OPERATOR_CONSOLE',
    reason: 'Routine baseline confirmation',
  };

  const sensorReadings: SensorReading[] = [
    { timestamp: now - 5000, temperature: 202.0, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: true, isSimulated: true },
    { timestamp: now, temperature: 204.5, normalMin: NORMAL_TEMP_MIN, normalMax: NORMAL_TEMP_MAX, isAbnormal: true, isSimulated: true },
  ];

  const assessment = evaluateCyberPhysicalState(
    180,
    204.5,
    [normalCmd],
    sensorReadings,
    now
  );

  assert.equal(assessment.classification, 'ISOLATED_PHYSICAL_ANOMALY');
  assert.equal(assessment.severity, 'HIGH');
  assert.equal(assessment.commandEvidence, null);
  assert.notEqual(assessment.physicalEvidence, null);
  assert.ok(assessment.correlationExplanation.includes('NOT a confirmed cyberattack'));
});

test('SimulationEngine lifecycle: attack, incident generation, and clean reset', () => {
  const engine = new SimulationEngine();

  const initialState = engine.getState();
  assert.equal(initialState.machineState.targetTemp, 180);
  assert.equal(initialState.machineState.status, 'NORMAL');
  assert.equal(initialState.activeIncident, null);

  const attackState = engine.triggerAttack('PHONE_ATTACKER');
  assert.equal(attackState.machineState.targetTemp, 220);
  assert.equal(attackState.latestCommand?.isSuspicious, true);
  assert.equal(attackState.latestCommand?.newSetpoint, 220);

  const resetState = engine.resetSimulation();
  assert.equal(resetState.machineState.targetTemp, 180);
  assert.equal(resetState.machineState.status, 'NORMAL');
  assert.equal(resetState.activeIncident, null);
  assert.equal(resetState.financialAssessment, null);

  engine.destroy();
});

test('Protection Engine: blocks out-of-policy commands when Protection Mode is enabled', () => {
  const engine = new SimulationEngine();

  // Enable protection mode
  const protectedState = engine.applyProtectionAction('ENABLE_PROTECTION_MODE');
  assert.equal(protectedState.protectionMode, true);
  assert.equal(protectedState.enforceTemperatureLimits, true);

  // Trigger attack attempt
  const attackAttempt = engine.triggerAttack('PHONE_ATTACKER');
  assert.equal(attackAttempt.machineState.targetTemp, 180); // Setpoint remains safe!
  assert.equal(attackAttempt.latestCommand?.status, 'BLOCKED_BY_POLICY');
  assert.equal(attackAttempt.protectionAuditLog.length, 2);

  engine.destroy();
});

test('Protection Engine: Operator Verification Challenge rejects suspicious setpoint change', () => {
  const engine = new SimulationEngine();

  // Enable verification challenges
  engine.applyProtectionAction('REQUIRE_VERIFICATION');

  // Trigger attack
  const pendingState = engine.triggerAttack('PHONE_ATTACKER');
  assert.notEqual(pendingState.pendingCommand, null);
  assert.equal(pendingState.pendingCommand?.newSetpoint, 220);

  // Operator rejects request
  const rejectedState = engine.respondToPendingCommand(false);
  assert.equal(rejectedState.pendingCommand, null);
  assert.equal(rejectedState.machineState.targetTemp, 180); // Unchanged

  engine.destroy();
});
