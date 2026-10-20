/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_DOWNTIME_MINUTES,
  DEFAULT_LOSS_PER_MINUTE,
  DEFAULT_RECOVERY_COST,
  DEFAULT_WASTED_MATERIAL,
} from './constants.ts';
import type { FinancialAssessment, FinancialInputs } from './types.ts';

/**
 * Formats a numeric value into standard Indian Rupee notation (e.g. ₹6,92,500).
 */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('en-IN').format(rounded);
  return `₹${formatted}`;
}

/**
 * Deterministically calculates financial loss based on production downtime,
 * material waste, and recovery costs.
 * 
 * Formula:
 * Estimated potential loss =
 *   (downtime minutes × production contribution at risk per minute)
 *   + wasted-material cost
 *   + applicable recovery costs.
 */
export function calculateFinancialLoss(inputs?: Partial<FinancialInputs>): FinancialAssessment {
  const downtimeMinutes = Math.max(0, inputs?.downtimeMinutes ?? DEFAULT_DOWNTIME_MINUTES);
  const lossPerMinute = Math.max(0, inputs?.lossPerMinute ?? DEFAULT_LOSS_PER_MINUTE);
  const wastedMaterialCost = Math.max(0, inputs?.wastedMaterialCost ?? DEFAULT_WASTED_MATERIAL);
  const recoveryCost = Math.max(0, inputs?.recoveryCost ?? DEFAULT_RECOVERY_COST);

  const downtimeLossTotal = downtimeMinutes * lossPerMinute;
  const totalEstimatedLoss = downtimeLossTotal + wastedMaterialCost + recoveryCost;

  return {
    downtimeMinutes,
    lossPerMinute,
    downtimeLossTotal,
    wastedMaterialCost,
    recoveryCost,
    totalEstimatedLoss,
    currency: 'INR',
    formula: `(${downtimeMinutes} min × ${formatINR(lossPerMinute)}/min) + ${formatINR(wastedMaterialCost)} + ${formatINR(recoveryCost)}`,
    assumptions: {
      productionRateDesc: `Automated reactor line baseline: ${formatINR(lossPerMinute)} production margin per minute.`,
      downtimeDesc: `Estimated line interlock & forensic containment duration: ${downtimeMinutes} minutes.`,
      wasteDesc: `Degraded polymer chemical batch due to 220°C thermal excursion: ${formatINR(wastedMaterialCost)}.`,
      recoveryDesc: `Post-incident physical sensor recalibration and safety inspection: ${formatINR(recoveryCost)}.`,
    },
    disclaimer: 'Illustrative simulation estimate based on configured industrial reactor loss parameters. Not an audited factory balance sheet figure.',
  };
}
