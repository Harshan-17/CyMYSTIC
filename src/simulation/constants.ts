/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MACHINE_ID = 'MACHINE-01';
export const MACHINE_NAME = 'Industrial Thermal Reactor 01';

// Temperature setpoints and thresholds (°C)
export const NORMAL_TARGET_TEMP = 180;
export const SUSPICIOUS_TARGET_TEMP = 220;
export const NORMAL_TEMP_MIN = 175;
export const NORMAL_TEMP_MAX = 185;

// Strict safety limits for input validation
export const ABSOLUTE_MIN_TEMP = 0;
export const ABSOLUTE_MAX_TEMP = 350;

// Temporal correlation window (in milliseconds)
// 120 seconds = 2 minutes
export const CORRELATION_WINDOW_MS = 120 * 1000;

// Financial loss calculation defaults (in INR ₹)
export const DEFAULT_DOWNTIME_MINUTES = 45; // 45 minutes of line triage & safety lockout
export const DEFAULT_LOSS_PER_MINUTE = 8500; // ₹8,500 per minute production contribution at risk
export const DEFAULT_WASTED_MATERIAL = 245000; // ₹2,45,000 thermal degradation waste (scrap batch)
export const DEFAULT_RECOVERY_COST = 65000; // ₹65,000 safety inspection, audit & recalibration

export const INITIAL_SENSOR_HISTORY_COUNT = 15;
export const SENSOR_POLL_INTERVAL_MS = 1000;
