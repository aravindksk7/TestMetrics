import DashboardHeader    from '@/components/layout/DashboardHeader'
import FilterBar          from '@/components/layout/FilterBar'
import KpiCard            from '@/components/kpi/KpiCard'
import PassRateTrendChart from '@/components/charts/PassRateTrendChart'
import OutcomesByReleaseChart from '@/components/charts/OutcomesByReleaseChart'
import FailureHeatmap     from '@/components/charts/FailureHeatmap'
import ReleaseSummaryTable from '@/components/charts/ReleaseSummaryTable'
import DefectTrendChart   from '@/components/charts/DefectTrendChart'
import ErrorWidget        from '@/components/dashboard/ErrorWidget'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useFilters }     from '@/hooks/useFilters'
import { useReleases }   from '@/hooks/useFilterOptions'
import {
  useKpis, usePassRateTrend, useOutcomesByRelease,
  useHeatmap, useReleaseSummary, useDefectTrend,
} from '@/hooks/useMetrics'

export default function Dashboard() {
  const { activeFilters } = useFilters()

  const kpis        = useKpis(activeFilters)
  const trend       = usePassRateTrend(activeFilters)
  const outcomes    = useOutcomesByRelease(activeFilters)
  const heatmap     = useHeatmap(activeFilters)
  const summary     = useReleaseSummary(activeFilters)
  const defectTrend = useDefectTrend(activeFilters)
  const releases    = useReleases()

  const releaseIds: Record<string, number> = Object.fromEntries(
    (releases.data?.releases ?? []).map((r) => [r.release_name, r.release_id])
  )

  return (
    <div className="min-h-screen bg-db-base">
      <DashboardHeader />
      <FilterBar />

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-2 px-3.5 pt-2.5 pb-1.5">
        <KpiCard
          label="Release Readiness Index"
          data={kpis.data?.rri}
          isLoading={kpis.isLoading}
          accentColor="#f2a900"
        />
        <KpiCard
          label="Pass Rate %"
          data={kpis.data?.pass_rate}
          isLoading={kpis.isLoading}
          accentColor="#4ec77a"
          formatter={(v) => `${v}%`}
        />
        <KpiCard
          label="Requirement Coverage %"
          data={kpis.data?.requirement_coverage}
          isLoading={kpis.isLoading}
          accentColor="#0078d4"
          formatter={(v) => `${v}%`}
        />
        <KpiCard
          label="Open Critical Defects"
          data={kpis.data?.open_critical_defects}
          isLoading={kpis.isLoading}
          accentColor="#e05c5c"
        />
        <KpiCard
          label="Blocked %"
          data={kpis.data?.blocked_pct}
          isLoading={kpis.isLoading}
          accentColor="#f0a030"
          formatter={(v) => `${v}%`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pb-2">
        <Card>
          <CardHeader><CardTitle>Pass Rate Trend (Weekly)</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {trend.error
              ? <ErrorWidget message={trend.error.message} />
              : <PassRateTrendChart data={trend.data} isLoading={trend.isLoading} />
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Execution Outcomes by Release</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {outcomes.error
              ? <ErrorWidget message={outcomes.error.message} />
              : <OutcomesByReleaseChart data={outcomes.data} isLoading={outcomes.isLoading} />
            }
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pb-3">
        <Card>
          <CardHeader><CardTitle>Failure Rate: Program × Environment</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {heatmap.error
              ? <ErrorWidget message={heatmap.error.message} />
              : <FailureHeatmap data={heatmap.data} isLoading={heatmap.isLoading} />
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>At-Risk Releases — Readiness Summary</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {summary.error
              ? <ErrorWidget message={summary.error.message} />
              : <ReleaseSummaryTable data={summary.data} isLoading={summary.isLoading} releaseIds={releaseIds} />
            }
          </CardContent>
        </Card>
      </div>

      {/* Defect Trend Row */}
      <div className="px-3.5 pb-3">
        <Card>
          <CardHeader><CardTitle>Open Defects Over Time (Monthly)</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {defectTrend.error
              ? <ErrorWidget message={defectTrend.error.message} />
              : <DefectTrendChart data={defectTrend.data} isLoading={defectTrend.isLoading} />
            }
          </CardContent>
        </Card>
      </div>

      {/* Legend Footer */}
      <div className="flex items-center gap-4 px-3.5 py-1.5 border-t border-db-border text-[9px]">
        <span className="text-pass">● Passed</span>
        <span className="text-fail">● Failed</span>
        <span className="text-blocked">● Blocked</span>
        <span className="text-db-header">● In Progress</span>
        <span className="ml-auto text-db-muted">
          Heatmap: Green &lt;15% · Amber 15–30% · Red &gt;30% fail rate
        </span>
      </div>
    </div>
  )
}
