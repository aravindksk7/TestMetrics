import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { KpiValue } from '@/types/metrics'

interface KpiCardProps {
  label:       string
  data?:       KpiValue
  isLoading:   boolean
  accentColor: string
  formatter?:  (v: number) => string
}

const TREND_ICON  = { up: '▲', down: '▼', neutral: '—' } as const
const TREND_CLASS = { up: 'text-pass', down: 'text-fail', neutral: 'text-blocked' } as const

export default function KpiCard({ label, data, isLoading, accentColor, formatter }: KpiCardProps) {
  const fmt = formatter ?? ((v) => String(v))

  return (
    <Card className="p-3" style={{ borderLeft: `3px solid ${accentColor}` }}>
      <div className="text-[9px] uppercase tracking-wider text-db-muted mb-1">{label}</div>
      {isLoading || !data ? (
        <>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-28" />
        </>
      ) : (
        <>
          <div className="text-[26px] font-bold leading-none" style={{ color: accentColor }}>
            {fmt(data.value)}
          </div>
          <div className={`text-[9px] mt-1 ${TREND_CLASS[data.trend_direction]}`}>
            {TREND_ICON[data.trend_direction]} {data.trend_label}
          </div>
        </>
      )}
    </Card>
  )
}
