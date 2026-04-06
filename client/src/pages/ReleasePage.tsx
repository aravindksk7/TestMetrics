import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import ReleaseKpiStrip      from '@/components/release/ReleaseKpiStrip'
import ReleaseBreakdownTable from '@/components/release/ReleaseBreakdownTable'
import ReleaseDefectList     from '@/components/release/ReleaseDefectList'
import PassRateTrendChart    from '@/components/charts/PassRateTrendChart'
import ErrorWidget           from '@/components/dashboard/ErrorWidget'
import { useReleaseDetail, useReleaseBreakdown, useReleaseTrend, useReleaseDefects } from '@/hooks/useRelease'
import { cn } from '@/lib/utils'

function rriColorClass(rri: number) {
  if (rri < 60) return 'bg-fail text-white'
  if (rri <= 75) return 'bg-blocked text-white'
  return 'bg-pass text-white'
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Completed: 'bg-db-panel border border-pass/40 text-pass',
    Active:    'bg-db-panel border border-blocked/40 text-blocked',
    Planning:  'bg-db-panel border border-[#0078d4]/40 text-[#0078d4]',
  }
  return map[status] ?? 'bg-db-panel border border-db-border text-db-muted'
}

export default function ReleasePage() {
  const { releaseId } = useParams<{ releaseId: string }>()
  const navigate = useNavigate()

  const detail    = useReleaseDetail(releaseId)
  const breakdown = useReleaseBreakdown(releaseId)
  const trend     = useReleaseTrend(releaseId)
  const defects   = useReleaseDefects(releaseId)

  const d = detail.data

  return (
    <div className="min-h-screen bg-db-base">
      {/* Header */}
      <header className="bg-db-header px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-[11px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <span className="text-white/40">|</span>
          <Zap className="h-4 w-4 text-white" />
          <span className="text-white font-semibold text-[15px] tracking-tight">
            Xray Test Metrics&nbsp;&nbsp;|&nbsp;&nbsp;Release Detail
          </span>
        </div>
        <div className="flex items-center gap-3">
          {detail.isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : d ? (
            <>
              <span className="text-white font-bold text-[16px]">{d.release_name}</span>
              <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded', statusBadge(d.status))}>
                {d.status}
              </span>
              <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded', rriColorClass(d.rri))}>
                RRI {d.rri.toFixed(1)}
              </span>
              <span className="text-blue-200 text-[11px]">
                {d.release_date ? new Date(d.release_date).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
              </span>
            </>
          ) : null}
        </div>
      </header>

      <div className="px-3.5 pt-3 pb-2">
        {/* KPI strip */}
        <ReleaseKpiStrip data={d} isLoading={detail.isLoading} />
      </div>

      {/* Breakdown + Trend */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pb-2">
        <Card>
          <CardHeader>
            <CardTitle>Execution Results — Program × Environment</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {breakdown.error
              ? <ErrorWidget message={breakdown.error.message} />
              : <ReleaseBreakdownTable data={breakdown.data} isLoading={breakdown.isLoading} />
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Pass Rate Trend</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {trend.error
              ? <ErrorWidget message={trend.error.message} />
              : <PassRateTrendChart data={trend.data} isLoading={trend.isLoading} />
            }
          </CardContent>
        </Card>
      </div>

      {/* Defect list */}
      <div className="px-3.5 pb-4">
        <Card>
          <CardHeader>
            <CardTitle>
              Defects
              {d ? (
                <span className="ml-2 text-[10px] font-normal text-db-muted">
                  {d.open_critical} open critical · {d.total_defects} total
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {defects.error
              ? <ErrorWidget message={defects.error.message} />
              : <ReleaseDefectList data={defects.data} isLoading={defects.isLoading} />
            }
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
