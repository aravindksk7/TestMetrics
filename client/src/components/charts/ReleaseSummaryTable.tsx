import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ReleaseSummaryResponse, RriColor } from '@/types/metrics'

interface Props {
  data?:       ReleaseSummaryResponse
  isLoading:   boolean
  releaseIds?: Record<string, number>
}

const ROW_BG: Record<RriColor, string> = {
  red:   'bg-[#2a1e1e]',
  amber: 'bg-[#2a2218]',
  green: 'bg-[#1e2a20]',
}

const BADGE_BG: Record<RriColor, string> = {
  red:   '#e05c5c',
  amber: '#c07010',
  green: '#2a7a40',
}

const COL_COLOR: Record<RriColor, string> = {
  red:   'text-fail',
  amber: 'text-blocked',
  green: 'text-pass',
}

export default function ReleaseSummaryTable({ data, isLoading, releaseIds = {} }: Props) {
  const navigate = useNavigate()

  if (isLoading || !data) {
    return <Skeleton className="h-[145px] w-full" />
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-[8px]">
        <thead>
          <tr className="bg-[#1a2d40]">
            {['Release', 'Pass%', 'Fail%', 'Crit Defects', 'Blocked%', 'RRI'].map((h) => (
              <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.releases.map((r) => {
            const releaseId = releaseIds[r.release_name]
            return (
            <tr
              key={r.release_name}
              onClick={() => releaseId && navigate(`/release/${releaseId}`)}
              className={cn(
                'border-b border-db-border/30',
                ROW_BG[r.rri_color],
                releaseId ? 'cursor-pointer hover:brightness-125 transition-all' : '',
              )}
            >
              <td className={cn('px-2 py-1.5 font-medium', COL_COLOR[r.rri_color])}>{r.release_name}</td>
              <td className={cn('px-2 py-1.5', COL_COLOR[r.rri_color])}>{r.pass_pct.toFixed(1)}%</td>
              <td className={cn('px-2 py-1.5', COL_COLOR[r.rri_color])}>{r.fail_pct.toFixed(1)}%</td>
              <td className={cn('px-2 py-1.5', COL_COLOR[r.rri_color])}>{r.critical_defects}</td>
              <td className={cn('px-2 py-1.5', COL_COLOR[r.rri_color])}>{r.blocked_pct.toFixed(1)}%</td>
              <td className="px-2 py-1.5">
                <span
                  className="inline-block px-2 py-0.5 rounded text-white font-bold text-[8px]"
                  style={{ backgroundColor: BADGE_BG[r.rri_color] }}
                >
                  {r.rri.toFixed(1)}
                </span>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
      <p className="text-[8px] italic text-db-muted mt-1 px-1">
        Sorted by Release Readiness Index (worst first) — click a row to drill through
      </p>
    </div>
  )
}
