import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReleaseBreakdownResponse } from '@/types/metrics'

interface Props {
  data?:     ReleaseBreakdownResponse
  isLoading: boolean
}

function cellColor(passPct: number) {
  if (passPct >= 80) return 'text-pass'
  if (passPct >= 60) return 'text-blocked'
  return 'text-fail'
}

export default function ReleaseBreakdownTable({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return <Skeleton className="h-[160px] w-full" />
  }

  const { programs, environments, cells } = data
  const cellMap = new Map(cells.map((c) => [`${c.program}:${c.env}`, c]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px]">
        <thead>
          <tr className="bg-[#1a2d40]">
            <th className="px-2 py-1.5 text-left font-semibold text-db-label">Program</th>
            {environments.map((env) => (
              <th key={env} className="px-2 py-1.5 text-center font-semibold text-db-label">{env}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {programs.map((prog, pi) => (
            <tr key={prog} className={cn('border-b border-db-border/30', pi % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
              <td className="px-2 py-1.5 font-medium text-db-label">{prog}</td>
              {environments.map((env) => {
                const cell = cellMap.get(`${prog}:${env}`)
                if (!cell) return (
                  <td key={env} className="px-2 py-1.5 text-center text-db-muted">—</td>
                )
                return (
                  <td key={env} className="px-2 py-1.5 text-center">
                    <span className={cn('font-bold', cellColor(cell.pass_pct))}>
                      {cell.pass_pct.toFixed(0)}%
                    </span>
                    <span className="text-db-muted ml-1">
                      /{cell.fail_pct.toFixed(0)}%/{cell.blocked_pct.toFixed(0)}%
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={environments.length + 1} className="px-2 pt-1 text-[8px] italic text-db-muted">
              Pass% / Fail% / Blocked%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
