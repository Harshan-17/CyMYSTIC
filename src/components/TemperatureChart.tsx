/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { SensorReading } from '../simulation/types.ts';
import { NORMAL_TEMP_MAX, NORMAL_TEMP_MIN } from '../simulation/constants.ts';

interface TemperatureChartProps {
  readings: SensorReading[];
  targetTemp: number;
  height?: number;
}

export const TemperatureChart: React.FC<TemperatureChartProps> = ({
  readings,
  targetTemp,
  height = 220,
}) => {
  if (!readings || readings.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center bg-[#131720] rounded border border-[#202634] text-xs text-slate-400"
      >
        Waiting for temperature data...
      </div>
    );
  }

  // Bounds
  const minTemp = 160;
  const maxTemp = 240;
  const tempRange = maxTemp - minTemp;

  // Viewbox coordinates
  const svgWidth = 800;
  const svgHeight = height;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 25;
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const getY = (temp: number) => {
    const clamped = Math.max(minTemp, Math.min(maxTemp, temp));
    const normalized = (clamped - minTemp) / tempRange;
    return padTop + chartHeight * (1 - normalized);
  };

  const getX = (index: number, total: number) => {
    if (total <= 1) return padLeft + chartWidth / 2;
    return padLeft + (index / (total - 1)) * chartWidth;
  };

  // Safe operating range band [175°C, 185°C]
  const safeBandTop = getY(NORMAL_TEMP_MAX);
  const safeBandBottom = getY(NORMAL_TEMP_MIN);
  const safeBandHeight = Math.max(2, safeBandBottom - safeBandTop);

  // Target temperature line
  const targetY = getY(targetTemp);

  // Build telemetry polyline path
  const points = readings
    .map((r, i) => `${getX(i, readings.length)},${getY(r.temperature)}`)
    .join(' ');

  const latestReading = readings[readings.length - 1];
  const latestX = getX(readings.length - 1, readings.length);
  const latestY = getY(latestReading.temperature);

  const isExcursion = latestReading.temperature > NORMAL_TEMP_MAX;
  const yTicks = [160, 180, 200, 220, 240];

  return (
    <div className="w-full bg-[#131720] border border-[#202634] rounded-lg p-4 select-none">
      {/* Clean Legend Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-[#1c222e] text-xs">
        <span className="font-semibold text-slate-200">Temperature Trend</span>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500/20 border border-emerald-500/50 rounded-sm inline-block"></span>
            <span>Normal range ({NORMAL_TEMP_MIN}°–{NORMAL_TEMP_MAX}°C)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-amber-400 inline-block"></span>
            <span>Target ({targetTemp}°C)</span>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
      >
        <defs>
          <linearGradient id="bandGradSimple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Safe Band Shading */}
        <rect
          x={padLeft}
          y={safeBandTop}
          width={chartWidth}
          height={safeBandHeight}
          fill="url(#bandGradSimple)"
          stroke="#10b981"
          strokeWidth="0.5"
          strokeDasharray="2,2"
          opacity="0.5"
        />

        {/* Y Gridlines and labels */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={padLeft + chartWidth}
                y2={y}
                stroke="#1b212c"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fill="#64748b"
                fontSize="11"
                className="font-mono"
              >
                {tick}°
              </text>
            </g>
          );
        })}

        {/* Target Setpoint Line */}
        <line
          x1={padLeft}
          y1={targetY}
          x2={padLeft + chartWidth}
          y2={targetY}
          stroke={targetTemp > NORMAL_TEMP_MAX ? '#ef4444' : '#eab308'}
          strokeWidth="1.5"
          strokeDasharray="4,3"
        />

        {/* Telemetry Main Line */}
        <polyline
          fill="none"
          stroke={isExcursion ? '#ef4444' : '#38bdf8'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Current Reading Dot & Label */}
        <circle
          cx={latestX}
          cy={latestY}
          r="4.5"
          fill={isExcursion ? '#ef4444' : '#38bdf8'}
          stroke="#131720"
          strokeWidth="2"
        />
        <text
          x={latestX > svgWidth - 80 ? latestX - 10 : latestX + 10}
          y={latestY - 6}
          textAnchor={latestX > svgWidth - 80 ? 'end' : 'start'}
          fill={isExcursion ? '#f87171' : '#e2e8f0'}
          fontSize="12"
          fontWeight="bold"
          className="font-mono"
        >
          {latestReading.temperature.toFixed(1)}°C
        </text>

        {/* Bottom baseline */}
        <line
          x1={padLeft}
          y1={padTop + chartHeight}
          x2={padLeft + chartWidth}
          y2={padTop + chartHeight}
          stroke="#202735"
          strokeWidth="1"
        />

        <text
          x={padLeft}
          y={padTop + chartHeight + 16}
          fill="#64748b"
          fontSize="10"
        >
          Earlier
        </text>
        <text
          x={padLeft + chartWidth}
          y={padTop + chartHeight + 16}
          textAnchor="end"
          fill="#64748b"
          fontSize="10"
        >
          Now
        </text>
      </svg>
    </div>
  );
};
