import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AppHealth, AppHealthResponse, HealthColor } from '@/types/metrics'

interface Props {
  data?:     AppHealthResponse
  isLoading: boolean
}

const HEALTH_COLOR: Record<HealthColor, string> = {
  green: 'text-pass',
  amber: 'text-blocked',
  red:   'text-fail',
}

const PROGRAM_BADGE: Record<string, string> = {
  Alpha: 'bg-pass/20 text-pass border-pass/30',
  Beta:  'bg-[#0078d4]/20 text-[#0078d4] border-[#0078d4]/30',
  Gamma: 'bg-blocked/20 text-blocked border-blocked/30',
  Delta: 'bg-[#c77ae0]/20 text-[#c77ae0] border-[#c77ae0]/30',
}

function Bar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 bg-db-row rounded-full h-1 overflow-hidden">
        <div
          className={cn('h-full rounded-full', colorClass)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[9px] tabular-nums w-7 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

export default function AppHealthTable({ data, isLoading }: Props) {
  if (isLoading || !data) return <Skeleton className="h-[260px] w-full" />

  return (
    <div className="overflow-auto max-h-[260px]">
      <table className="w-full text-[9px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#1a2d40]">
            {['Application', 'Program', 'Pass %', 'Fail %', 'Blocked %', 'Execs'].map((h) => (
              <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.apps.map((a: AppHealth, i) => (
            <tr key={a.app_id} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
              <td className={cn('px-2 py-1.5 font-medium', HEALTH_COLOR[a.health])}>{a.app_name}</td>
              <td className="px-2 py-1.5">
                <span className={cn(
                  'inline-block px-1.5 py-0.5 rounded border text-[8px] font-medium',
                  PROGRAM_BADGE[a.program_name] ?? 'bg-db-row text-db-muted border-db-border'
                )}>
                  {a.program_name}
                </span>
              </td>
              <td className="px-2 py-1.5">
                <Bar pct={a.pass_pct} colorClass="bg-pass" />
              </td>
              <td className="px-2 py-1.5">
                <Bar pct={a.fail_pct} colorClass="bg-fail" />
              </td>
              <td className="px-2 py-1.5">
                <Bar pct={a.blocked_pct} colorClass="bg-blocked" />
              </td>
              <td className="px-2 py-1.5 text-db-muted tabular-nums">{a.total_executions.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
