import { Skeleton } from '@/components/ui/skeleton'
import type { ReleaseDetail } from '@/types/metrics'

interface Props {
  data?:     ReleaseDetail
  isLoading: boolean
}

interface MiniKpi { label: string; value: string; color: string }

function rriColor(rri: number) {
  if (rri < 60) return 'text-fail'
  if (rri <= 75) return 'text-blocked'
  return 'text-pass'
}

export default function ReleaseKpiStrip({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const kpis: MiniKpi[] = [
    { label: 'Pass %',       value: `${data.pass_pct.toFixed(1)}%`,        color: 'text-pass'    },
    { label: 'Fail %',       value: `${data.fail_pct.toFixed(1)}%`,        color: 'text-fail'    },
    { label: 'Blocked %',    value: `${data.blocked_pct.toFixed(1)}%`,     color: 'text-blocked' },
    { label: 'Coverage %',   value: `${data.coverage_pct.toFixed(1)}%`,    color: 'text-[#0078d4]' },
    { label: 'Open Critical',value: `${data.open_critical}`,               color: 'text-fail'    },
    { label: 'Executions',   value: data.total_executions.toLocaleString(), color: 'text-db-label' },
  ]

  return (
    <div className="grid grid-cols-6 gap-2">
      {kpis.map((k) => (
        <div key={k.label} className="bg-db-panel rounded-md px-3 py-2 border-l-2 border-db-border">
          <div className="text-[9px] text-db-muted uppercase tracking-wide mb-1">{k.label}</div>
          <div className={`text-xl font-bold leading-none ${k.color}`}>{k.value}</div>
        </div>
      ))}
    </div>
  )
}
