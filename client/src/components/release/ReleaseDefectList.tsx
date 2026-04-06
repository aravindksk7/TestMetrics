import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReleaseDefectsResponse, Defect } from '@/types/metrics'

interface Props {
  data?:     ReleaseDefectsResponse
  isLoading: boolean
}

const SEV_COLOR: Record<string, string> = {
  Critical: 'bg-fail/20 text-fail border-fail/40',
  High:     'bg-blocked/20 text-blocked border-blocked/40',
  Medium:   'bg-[#0078d4]/20 text-[#0078d4] border-[#0078d4]/40',
  Low:      'bg-db-row text-db-muted border-db-border',
}

const STATUS_COLOR: Record<string, string> = {
  Open:        'text-fail',
  'In Progress': 'text-blocked',
  Resolved:    'text-pass',
  Closed:      'text-db-muted',
}

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={cn('inline-block px-1.5 py-0.5 rounded border text-[8px] font-medium', className)}>
      {text}
    </span>
  )
}

export default function ReleaseDefectList({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return <Skeleton className="h-[200px] w-full" />
  }

  if (data.defects.length === 0) {
    return <p className="text-db-muted text-[10px] italic px-1 py-3">No defects recorded for this release.</p>
  }

  return (
    <div className="overflow-auto max-h-[240px]">
      <table className="w-full text-[9px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#1a2d40]">
            {['Severity', 'Status', 'Program', 'Created', 'Resolved', 'Age (days)'].map((h) => (
              <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.defects.map((d: Defect, i) => (
            <tr key={d.id} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
              <td className="px-2 py-1.5">
                <Badge text={d.severity} className={SEV_COLOR[d.severity] ?? SEV_COLOR.Low} />
              </td>
              <td className={cn('px-2 py-1.5 font-medium', STATUS_COLOR[d.status] ?? 'text-db-label')}>
                {d.status}
              </td>
              <td className="px-2 py-1.5 text-db-label">{d.program}</td>
              <td className="px-2 py-1.5 text-db-muted">{d.created_date ?? '—'}</td>
              <td className="px-2 py-1.5 text-db-muted">{d.resolved_date ?? '—'}</td>
              <td className="px-2 py-1.5 text-db-muted">{d.age_days}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
