/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CsvAnalysisSummary } from '../simulation/types.ts';

export interface CsvParseResult {
  success: boolean;
  summary?: CsvAnalysisSummary;
  errors: string[];
  warnings: string[];
}

/**
 * Sanitizes untrusted CSV cell text to prevent formula injection or unsafe rendering.
 */
function sanitizeCell(cell: string): string {
  let trimmed = cell.trim();
  // Strip formula prefixes
  if (['=', '+', '-', '@'].includes(trimmed.charAt(0))) {
    trimmed = "'" + trimmed;
  }
  return trimmed.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

/**
 * Parses and validates industrial telemetry CSV files.
 */
export function parseIndustrialCsv(rawCsvText: string, filename: string): CsvParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawCsvText || rawCsvText.trim().length === 0) {
    return { success: false, errors: ['CSV file is empty.'], warnings };
  }

  const lines = rawCsvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { success: false, errors: ['CSV file must contain a header row and at least one data record.'], warnings };
  }

  const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
  
  // Required core headers
  const reqHeaders = ['timestamp', 'target_temperature', 'measured_temperature'];
  const missingHeaders = reqHeaders.filter((req) => !rawHeaders.includes(req));

  if (missingHeaders.length > 0) {
    return {
      success: false,
      errors: [`Missing required CSV header columns: ${missingHeaders.join(', ')}. Supported headers: timestamp, machine_id, target_temperature, measured_temperature, production_status, downtime_minutes, wasted_material_cost, event_type`],
      warnings,
    };
  }

  const headerIndices = {
    timestamp: rawHeaders.indexOf('timestamp'),
    machineId: rawHeaders.indexOf('machine_id'),
    targetTemp: rawHeaders.indexOf('target_temperature'),
    measuredTemp: rawHeaders.indexOf('measured_temperature'),
    status: rawHeaders.indexOf('production_status'),
    downtimeMin: rawHeaders.indexOf('downtime_minutes'),
    wastedCost: rawHeaders.indexOf('wasted_material_cost'),
    eventType: rawHeaders.indexOf('event_type'),
  };

  const parsedRows: CsvAnalysisSummary['rows'] = [];
  let totalDowntime = 0;
  let totalWasted = 0;
  let tempSum = 0;
  let peakTemp = -Infinity;
  let anomalyCount = 0;
  const eventTypesSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells = rawLine.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

    if (cells.length < reqHeaders.length) {
      warnings.push(`Row ${i + 1} skipped: insufficient columns.`);
      continue;
    }

    const timestamp = sanitizeCell(cells[headerIndices.timestamp] || new Date().toISOString());
    const machineId = headerIndices.machineId !== -1 ? sanitizeCell(cells[headerIndices.machineId]) : 'MACHINE-01';
    const targetTemp = parseFloat(cells[headerIndices.targetTemp]);
    const measuredTemp = parseFloat(cells[headerIndices.measuredTemp]);

    if (isNaN(targetTemp) || isNaN(measuredTemp)) {
      warnings.push(`Row ${i + 1} skipped: invalid temperature values.`);
      continue;
    }

    const downtimeMin = headerIndices.downtimeMin !== -1 ? Math.max(0, parseFloat(cells[headerIndices.downtimeMin]) || 0) : 0;
    const wastedCost = headerIndices.wastedCost !== -1 ? Math.max(0, parseFloat(cells[headerIndices.wastedCost]) || 0) : 0;
    const status = headerIndices.status !== -1 ? sanitizeCell(cells[headerIndices.status]) : (measuredTemp > 185 ? 'CRITICAL_INCIDENT' : 'NORMAL');
    const eventType = headerIndices.eventType !== -1 ? sanitizeCell(cells[headerIndices.eventType]) : 'OPERATIONAL_EVENT';

    if (measuredTemp > 185 || targetTemp > 185) {
      anomalyCount++;
    }

    if (measuredTemp > peakTemp) {
      peakTemp = measuredTemp;
    }

    tempSum += measuredTemp;
    totalDowntime += downtimeMin;
    totalWasted += wastedCost;
    if (eventType) eventTypesSet.add(eventType);

    parsedRows.push({
      timestamp,
      machineId,
      targetTemp,
      measuredTemp,
      status,
      downtimeMin,
      wastedCost,
      eventType,
    });
  }

  if (parsedRows.length === 0) {
    return { success: false, errors: ['No valid data rows could be parsed from the CSV file.'], warnings };
  }

  // Calculate estimated loss (downtime * ₹8,500/min + wasted cost)
  const downtimeLoss = totalDowntime * 8500;
  const totalCalculatedLoss = downtimeLoss + totalWasted;

  const summary: CsvAnalysisSummary = {
    filename: sanitizeCell(filename),
    totalRows: lines.length - 1,
    validRows: parsedRows.length,
    invalidRows: (lines.length - 1) - parsedRows.length,
    machineId: parsedRows[0]?.machineId || 'MACHINE-01',
    avgTemp: Math.round((tempSum / parsedRows.length) * 10) / 10,
    peakTemp: peakTemp === -Infinity ? 180 : peakTemp,
    downtimeMinutes: totalDowntime,
    totalWastedCost: totalWasted,
    totalCalculatedLoss,
    anomalyCount,
    eventTypes: Array.from(eventTypesSet),
    rows: parsedRows,
  };

  return {
    success: true,
    summary,
    errors,
    warnings,
  };
}
