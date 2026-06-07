import { useState } from 'react'
import type { ChartPoint } from './types'
import { clamp, createAxisTicks, formatTick } from './utils'

const CHART_COLORS = {
  envelope: '#2ecbff',
  enpPoint: '#ff33ff',
  cgPoint: '#3cff4e',
  mmenp: '#d321ff',
  grid: 'rgba(255, 255, 255, 0.22)',
  axis: 'rgba(255, 255, 255, 0.6)',
}

interface WeightBalanceGraphProps {
  envelopePoints: ChartPoint[]
  centerOfGravity: number
  totalWeight: number
  enpMass: number
  mmenp: number
  frontCentering: number
  rearCentering: number
}

export function WeightBalanceGraph({
  envelopePoints,
  centerOfGravity,
  totalWeight,
  enpMass,
  mmenp,
  frontCentering,
  rearCentering,
}: WeightBalanceGraphProps) {
  const width = 960
  const height = 560
  const margin = { top: 24, right: 32, bottom: 56, left: 54 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const chartPoints = envelopePoints.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  const [isCgHovered, setIsCgHovered] = useState(false)
  const [isEnpHovered, setIsEnpHovered] = useState(false)

  if (!chartPoints.length) {
    return null
  }

  const xValues = [...chartPoints.map((point) => point.x), centerOfGravity, frontCentering, rearCentering]
  const yValues = [...chartPoints.map((point) => point.y), totalWeight, enpMass, mmenp]
  const xAxis = createAxisTicks(Math.min(...xValues), Math.max(...xValues), 8)
  const yAxis = createAxisTicks(Math.min(...yValues), Math.max(...yValues), 10)

  const toX = (value: number) =>
    margin.left + ((value - xAxis.min) / Math.max(xAxis.max - xAxis.min, 1)) * plotWidth
  const toY = (value: number) =>
    margin.top + ((yAxis.max - value) / Math.max(yAxis.max - yAxis.min, 1)) * plotHeight

  const closedEnvelope = chartPoints.length >= 3 ? [...chartPoints, chartPoints[0]] : chartPoints
  const envelopePolyline = closedEnvelope.map((point) => `${toX(point.x)},${toY(point.y)}`).join(' ')
  const cgX = toX(centerOfGravity)
  const totalY = toY(totalWeight)
  const enpY = toY(enpMass)
  const mmenpY = toY(mmenp)
  const centeringPercent = frontCentering === rearCentering
    ? 0
    : ((centerOfGravity - frontCentering) / (rearCentering - frontCentering)) * 100

  const tooltipLines = [
    `Centrage calculé: ${centerOfGravity.toFixed(1)} mm`,
    `Masse totale: ${totalWeight.toFixed(1)} kg`,
    `Position dans l'enveloppe: ${centeringPercent.toFixed(1)}%`,
  ]
  const tooltipWidth = 210
  const tooltipHeight = 60
  const tooltipX = clamp(cgX + 14, margin.left + 6, width - margin.right - tooltipWidth - 6)
  const tooltipY = clamp(totalY - tooltipHeight - 8, margin.top + 6, height - margin.bottom - tooltipHeight - 6)

  const enpTooltipLines = [
    `Masse ENP calculée: ${enpMass.toFixed(1)} kg`,
    `Limite MMENP: ${mmenp.toFixed(1)} kg`,
    `Marge restante: ${(mmenp - enpMass).toFixed(1)} kg`,
  ]
  const enpTooltipWidth = 190
  const enpTooltipHeight = 60
  const enpTooltipX = clamp(cgX - enpTooltipWidth - 14, margin.left + 6, width - margin.right - enpTooltipWidth - 6)
  const enpTooltipY = clamp(enpY - enpTooltipHeight - 8, margin.top + 6, height - margin.bottom - enpTooltipHeight - 6)

  return (
    <div className="mt-5 rounded-lg border border-border/60 bg-card p-3">
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="block h-auto w-full">
          <rect x={margin.left} y={margin.top} width={plotWidth} height={plotHeight} fill="transparent" />

          {yAxis.ticks.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={toY(tick)}
                y2={toY(tick)}
                stroke={CHART_COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={margin.left - 8}
                y={toY(tick) + 4}
                textAnchor="end"
                className="select-none fill-muted-foreground font-sans text-xs antialiased"
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {xAxis.ticks.map((tick) => (
            <g key={`x-${tick}`}>
              <line
                x1={toX(tick)}
                x2={toX(tick)}
                y1={margin.top}
                y2={height - margin.bottom}
                stroke={CHART_COLORS.grid}
                strokeWidth={1}
              />
              <text
                x={toX(tick)}
                y={height - margin.bottom + 16}
                textAnchor="middle"
                className="select-none fill-muted-foreground font-sans text-xs antialiased"
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}

          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={height - margin.bottom}
            y2={height - margin.bottom}
            stroke={CHART_COLORS.axis}
            strokeWidth={1}
          />
          <line
            x1={margin.left}
            x2={margin.left}
            y1={margin.top}
            y2={height - margin.bottom}
            stroke={CHART_COLORS.axis}
            strokeWidth={1}
          />

          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={mmenpY}
            y2={mmenpY}
            stroke={CHART_COLORS.mmenp}
            strokeWidth={2}
          />
          <text
            x={width - margin.right - 4}
            y={mmenpY - 8}
            textAnchor="end"
            className="select-none fill-foreground font-sans text-sm font-semibold antialiased"
          >
            Masse maximum éléments non portants: {mmenp.toFixed(1)} kg
          </text>

          <polyline
            points={envelopePolyline}
            fill="none"
            stroke={CHART_COLORS.envelope}
            strokeWidth={2}
          />
          {chartPoints.map((point, index) => (
            <circle
              key={`envelope-point-${index}`}
              cx={toX(point.x)}
              cy={toY(point.y)}
              r={2.8}
              fill={CHART_COLORS.envelope}
            />
          ))}

          <line
            x1={margin.left}
            x2={cgX}
            y1={totalY}
            y2={totalY}
            stroke={CHART_COLORS.cgPoint}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <line
            x1={cgX}
            x2={cgX}
            y1={height - margin.bottom}
            y2={totalY}
            stroke={CHART_COLORS.cgPoint}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />

          <g>
            <rect x={cgX - 5} y={enpY - 5} width={10} height={10} fill={CHART_COLORS.enpPoint} />
            <rect
              x={cgX - 6}
              y={enpY - 6}
              width={12}
              height={12}
              fill="rgba(0, 0, 0, 0.001)"
              pointerEvents="all"
              onMouseEnter={() => setIsEnpHovered(true)}
              onMouseLeave={() => setIsEnpHovered(false)}
              onFocus={() => setIsEnpHovered(true)}
              onBlur={() => setIsEnpHovered(false)}
              tabIndex={0}
            />
          </g>
          <g>
            <polygon
              points={`${cgX},${totalY - 7} ${cgX + 7},${totalY} ${cgX},${totalY + 7} ${cgX - 7},${totalY}`}
              fill={CHART_COLORS.cgPoint}
            />
            <circle
              cx={cgX}
              cy={totalY}
              r={7}
              fill="rgba(0, 0, 0, 0.001)"
              pointerEvents="all"
              onMouseEnter={() => setIsCgHovered(true)}
              onMouseLeave={() => setIsCgHovered(false)}
              onFocus={() => setIsCgHovered(true)}
              onBlur={() => setIsCgHovered(false)}
              tabIndex={0}
            />
          </g>

          {isCgHovered && (
            <g pointerEvents="none">
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                rx={6}
                className="fill-popover stroke-2 stroke-border"
              />
              <text
                x={tooltipX + 10}
                y={tooltipY + 18}
                className="select-none fill-foreground font-sans text-xs font-normal antialiased"
              >
                {tooltipLines.map((line, index) => (
                  <tspan key={line} x={tooltipX + 10} dy={index === 0 ? 0 : 16}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )}

          {isEnpHovered && (
            <g pointerEvents="none">
              <rect
                x={enpTooltipX}
                y={enpTooltipY}
                width={enpTooltipWidth}
                height={enpTooltipHeight}
                rx={6}
                className="fill-popover stroke-2 stroke-border"
              />
              <text
                x={enpTooltipX + 10}
                y={enpTooltipY + 18}
                className="select-none fill-foreground font-sans text-xs font-normal antialiased"
              >
                {enpTooltipLines.map((line, index) => (
                  <tspan key={line} x={enpTooltipX + 10} dy={index === 0 ? 0 : 16}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )}

          <text
            x={cgX + 6}
            y={height - margin.bottom - 8}
            className="select-none fill-green-400 font-sans text-sm font-bold antialiased"
          >
            {centeringPercent.toFixed(1)}%
          </text>

          <text
            x={margin.left + plotWidth / 2}
            y={height - 10}
            textAnchor="middle"
            className="select-none fill-foreground font-sans text-lg antialiased"
          >
            Centrage (mm)
          </text>
          <text
            x={14}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            className="select-none fill-foreground font-sans text-lg antialiased"
            transform={`rotate(-90, 14, ${margin.top + plotHeight / 2})`}
          >
            Masse (kg)
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-6 text-xs text-slate-100/95">
        <div className="flex items-center gap-2">
          <span className="block h-0.5 w-9" style={{ backgroundColor: CHART_COLORS.envelope }} />
          <span>Limite de centrage</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="block h-3 w-3" style={{ backgroundColor: CHART_COLORS.enpPoint }} />
          <span>Masse ENP + occupants + gueuses et/ou water ballast</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="block h-3 w-3 rotate-45"
            style={{ backgroundColor: CHART_COLORS.cgPoint }}
          />
          <span>Centrage calculé</span>
        </div>
      </div>
    </div>
  )
}
