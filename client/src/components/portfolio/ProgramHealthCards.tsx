import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ProgramHealth, HealthColor } from '@/types/metrics'

interface Props {
  programs:  ProgramHealth[]
  isLoading: boolean
}

const BORDER: Record<HealthColor, string> = {
  green: 'border-pass/50',
  amber: 'border-blocked/50',
  red:   'border-fail/50',
}
const LABEL: Record<HealthColor, string> = {
  green: 'text-pass',
  amber: 'text-blocked',
  red:   'text-fail',
}
const DOT: Record<HealthColor, string> = {
  green: 'bg-pass',
  amber: 'bg-blocked',
  red:   'bg-fail',
}
const BADGE_BG: Record<HealthColor, string> = {
  green: '#2a7a40',
  amber: '#c07010',
  red:   '#e05c5c',
}

function StatRow({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[9px] text-db-muted">{label}</span>
      <span className={cn('text-[10px] font-semibold tabular-nums', colorClass ?? 'text-db-label')}>{value}</span>
    </div>
  )
}

export default function ProgramHealthCards({ programs, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[0,1,2,3].map((i) => <Skeleton key={i} className="h-[170px]" />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {programs.map((p) => (
        <div
          key={p.program_id}
          className={cn(
            'bg-db-panel rounded border-l-4 px-3 pt-2.5 pb-3',
            BORDER[p.health]
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className={cn('inline-block w-2 h-2 rounded-full', DOT[p.health])} />
              <span className="text-[13px] font-bold text-white">{p.program_name}</span>
            </div>
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded text-white uppercase tracking-wide"
              style={{ backgroundColor: BADGE_BG[p.health] }}
            >
              {p.health}
            </span>
          </div>

          {/* Pass rate — big number */}
          <div className="mb-2.5">
            <span className={cn('text-[28px] font-bold leading-none tabular-nums', LABEL[p.health])}>
              {p.pass_pct.toFixed(1)}
            </span>
            <span className="text-[11px] text-db-muted ml-1">% pass</span>
          </div>

          <div className="border-t border-db-border/40 pt-2 space-y-0.5">
            <StatRow label="Fail %"           value={`${p.fail_pct.toFixed(1)}%`}    colorClass="text-fail" />
            <StatRow label="Blocked %"        value={`${p.blocked_pct.toFixed(1)}%`} colorClass="text-blocked" />
            <StatRow label="Open Critical"    value={String(p.open_critical)}         colorClass={p.open_critical > 0 ? 'text-fail' : 'text-pass'} />
            <StatRow label="Open Defects"     value={String(p.open_defects)} />
            <StatRow label="Total Executions" value={p.total_executions.toLocaleString()} />
          </div>
        </div>
      ))}
    </div>
  )
}
