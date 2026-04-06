import React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { HeatmapResponse, HeatmapColor } from '@/types/metrics'

interface Props {
  data?:     HeatmapResponse
  isLoading: boolean
}

const CELL_CLASSES: Record<HeatmapColor, string> = {
  green: 'bg-pass/20 text-pass   border-pass/30',
  amber: 'bg-blocked/20 text-blocked border-blocked/30',
  red:   'bg-fail/20 text-fail   border-fail/30',
}

export default function FailureHeatmap({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return <Skeleton className="h-[145px] w-full" />
  }

  const { programs, environments, cells } = data

  // Build lookup map: [program][env] → cell
  const cellMap = new Map(cells.map((c) => [`${c.program}:${c.environment}`, c]))

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `64px repeat(${environments.length}, 1fr)` }}
    >
      {/* Header row */}
      <div />
      {environments.map((env) => (
        <div key={env} className="text-center text-[9px] font-semibold text-db-label pb-1">
          {env}
        </div>
      ))}

      {/* Data rows */}
      {programs.map((prog) => (
        <React.Fragment key={prog}>
          <div className="text-[9px] text-db-label flex items-center pr-1 truncate">
            {prog}
          </div>
          {environments.map((env) => {
            const cell = cellMap.get(`${prog}:${env}`)
            return (
              <div
                key={`${prog}:${env}`}
                className={cn(
                  'rounded border text-center text-[9px] font-medium py-1.5',
                  cell ? CELL_CLASSES[cell.color] : 'bg-db-row text-db-muted border-db-border'
                )}
              >
                {cell ? `${cell.fail_rate}%` : '—'}
              </div>
            )
          })}
        </React.Fragment>
      ))}
    </div>
  )
}
