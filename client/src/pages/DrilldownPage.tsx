import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorWidget from '@/components/dashboard/ErrorWidget'
import FilterBar from '@/components/layout/FilterBar'
import { cn } from '@/lib/utils'
import { useFilters } from '@/hooks/useFilters'
import { useDrilldownKpis, useTopFailing, useDrillFlaky, useRecentExecs, useTypeSummary } from '@/hooks/useDrilldown'
import type { FailingTest, DrillFlakyTest, ExecutionRecord, TypeSummaryRow } from '@/types/metrics'

const STATUS_COLOR: Record<string, string> = {
  PASS:        'text-pass',
  FAIL:        'text-fail',
  BLOCKED:     'text-blocked',
  IN_PROGRESS: 'text-db-muted',
}
const STATUS_BADGE: Record<string, string> = {
  PASS:        'bg-pass/20 text-pass border-pass/30',
  FAIL:        'bg-fail/20 text-fail border-fail/30',
  BLOCKED:     'bg-blocked/20 text-blocked border-blocked/30',
  IN_PROGRESS: 'bg-db-row text-db-muted border-db-border',
}
const PRIORITY_COLOR: Record<string, string> = {
  High: 'text-fail', Medium: 'text-blocked', Low: 'text-db-muted',
}
const TYPE_COLOR: Record<string, string> = {
  Automated: 'text-pass', Cucumber: 'text-[#0078d4]', Manual: 'text-blocked', Generic: 'text-db-muted',
}

function KpiTile({ label, value, sub, accent, isLoading, alert }: {
  label: string; value: string | number; sub?: string; accent: string; isLoading: boolean; alert?: boolean
}) {
  if (isLoading) return <Skeleton className="h-[70px]" />
  return (
    <div className="bg-db-panel rounded border-t-2 px-3 py-2.5" style={{ borderColor: accent }}>
      <p className="text-[9px] text-db-muted uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-[26px] font-bold leading-none tabular-nums', alert ? 'text-fail' : 'text-white')}>{value}</p>
      {sub && <p className="text-[9px] text-db-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function failRateColor(r: number) {
  if (r >= 40) return 'text-fail'
  if (r >= 20) return 'text-blocked'
  return 'text-db-label'
}

export default function DrilldownPage() {
  const navigate = useNavigate()
  const { activeFilters } = useFilters()

  const kpis   = useDrilldownKpis(activeFilters)
  const topFail = useTopFailing(activeFilters)
  const flaky  = useDrillFlaky(activeFilters)
  const recent = useRecentExecs(activeFilters)
  const types  = useTypeSummary(activeFilters)

  const k = kpis.data

  return (
    <div className="min-h-screen bg-db-base">
      <header className="bg-db-header px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-[11px]">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
          <span className="text-white/40">|</span>
          <Search className="h-4 w-4 text-white" />
          <span className="text-white font-semibold text-[15px] tracking-tight">
            Xray Test Metrics&nbsp;&nbsp;|&nbsp;&nbsp;Detailed Drill-Through
          </span>
        </div>
        <span className="text-blue-200 text-[10px]">Use filters below to scope the analysis</span>
      </header>

      {/* Shared FilterBar */}
      <FilterBar />

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-2 px-3.5 pt-2.5 pb-1.5">
        <KpiTile label="Total Executions"  value={k?.total_execs.toLocaleString() ?? '—'}   accent="#0078d4" isLoading={kpis.isLoading} />
        <KpiTile label="Unique Tests"      value={k?.unique_tests.toLocaleString() ?? '—'}  accent="#4ec77a" isLoading={kpis.isLoading} />
        <KpiTile label="Fail %"            value={k ? `${k.fail_pct}%` : '—'}               accent="#e05c5c" isLoading={kpis.isLoading} alert={!!k && k.fail_pct >= 20} />
        <KpiTile label="Blocked %"         value={k ? `${k.blocked_pct}%` : '—'}            accent="#f2a900" isLoading={kpis.isLoading} alert={!!k && k.blocked_pct >= 10} />
        <KpiTile label="Automation %"      value={k ? `${k.automation_pct}%` : '—'}         accent="#4ec77a" isLoading={kpis.isLoading} sub="Automated + Cucumber" />
      </div>

      {/* Test Type Summary + Top Failing */}
      <div className="grid grid-cols-3 gap-2 px-3.5 pb-2">
        {/* Type summary */}
        <Card>
          <CardHeader><CardTitle>Results by Test Type</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {types.error ? <ErrorWidget message={types.error.message} /> : (
              types.isLoading ? <Skeleton className="h-[180px]" /> : (
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="bg-[#1a2d40]">
                      {['Type','Total','Pass','Fail','Blocked','Pass %'].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(types.data?.types ?? []).map((t: TypeSummaryRow, i) => (
                      <tr key={t.test_type} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
                        <td className={cn('px-2 py-1.5 font-medium', TYPE_COLOR[t.test_type])}>{t.test_type}</td>
                        <td className="px-2 py-1.5 text-db-muted tabular-nums">{t.total.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-pass tabular-nums">{t.passed.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-fail tabular-nums">{t.failed.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-blocked tabular-nums">{t.blocked.toLocaleString()}</td>
                        <td className={cn('px-2 py-1.5 font-bold tabular-nums', t.pass_pct >= 80 ? 'text-pass' : t.pass_pct >= 60 ? 'text-blocked' : 'text-fail')}>
                          {t.pass_pct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </CardContent>
        </Card>

        {/* Top Failing */}
        <div className="col-span-2">
          <Card>
            <CardHeader><CardTitle>Top Failing Tests (by Fail Rate)</CardTitle></CardHeader>
            <CardContent className="pb-3">
              {topFail.error ? <ErrorWidget message={topFail.error.message} /> : (
                topFail.isLoading ? <Skeleton className="h-[180px]" /> : (
                  <div className="overflow-auto max-h-[200px]">
                    <table className="w-full text-[9px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#1a2d40]">
                          {['Test Key','Type','Priority','Execs','Failures','Fail %','Programs','Envs','Releases'].map((h) => (
                            <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(topFail.data?.tests ?? []).map((t: FailingTest, i) => (
                          <tr key={t.test_key} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
                            <td className="px-2 py-1.5 font-mono text-db-label">{t.test_key}</td>
                            <td className={cn('px-2 py-1.5', TYPE_COLOR[t.test_type])}>{t.test_type}</td>
                            <td className={cn('px-2 py-1.5 font-medium', PRIORITY_COLOR[t.priority])}>{t.priority}</td>
                            <td className="px-2 py-1.5 text-db-muted tabular-nums">{t.total_execs}</td>
                            <td className="px-2 py-1.5 text-fail tabular-nums">{t.failures}</td>
                            <td className={cn('px-2 py-1.5 font-bold tabular-nums', failRateColor(t.fail_rate))}>{t.fail_rate.toFixed(1)}%</td>
                            <td className="px-2 py-1.5 text-db-muted max-w-[120px] truncate">{t.programs}</td>
                            <td className="px-2 py-1.5 text-db-muted tabular-nums">{t.envs_count}</td>
                            <td className="px-2 py-1.5 text-db-muted tabular-nums">{t.releases_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Flaky Tests + Recent Executions */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pb-4">
        <Card>
          <CardHeader><CardTitle>Flaky Tests</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {flaky.error ? <ErrorWidget message={flaky.error.message} /> : (
              flaky.isLoading ? <Skeleton className="h-[240px]" /> : (
                <div className="overflow-auto max-h-[240px]">
                  <table className="w-full text-[9px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#1a2d40]">
                        {['Test Key','Type','Pri','Execs','Pass','Fail','Fail %','Environments'].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(flaky.data?.tests ?? []).map((t: DrillFlakyTest, i) => (
                        <tr key={t.test_key} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
                          <td className="px-2 py-1.5 font-mono text-db-label">{t.test_key}</td>
                          <td className={cn('px-2 py-1.5', TYPE_COLOR[t.test_type])}>{t.test_type}</td>
                          <td className={cn('px-2 py-1.5 font-medium', PRIORITY_COLOR[t.priority])}>{t.priority}</td>
                          <td className="px-2 py-1.5 text-db-muted tabular-nums">{t.total_execs}</td>
                          <td className="px-2 py-1.5 text-pass tabular-nums">{t.passes}</td>
                          <td className="px-2 py-1.5 text-fail tabular-nums">{t.failures}</td>
                          <td className={cn('px-2 py-1.5 font-bold tabular-nums', failRateColor(t.fail_rate))}>{t.fail_rate.toFixed(1)}%</td>
                          <td className="px-2 py-1.5 text-db-muted text-[8px]">{t.environments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Executions (last 100)</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {recent.error ? <ErrorWidget message={recent.error.message} /> : (
              recent.isLoading ? <Skeleton className="h-[240px]" /> : (
                <div className="overflow-auto max-h-[240px]">
                  <table className="w-full text-[9px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#1a2d40]">
                        {['Date','Test','Type','Priority','Program','Env','Release','Status'].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(recent.data?.executions ?? []).map((e: ExecutionRecord, i) => (
                        <tr key={i} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
                          <td className="px-2 py-1.5 text-db-muted whitespace-nowrap">{e.execution_date}</td>
                          <td className="px-2 py-1.5 font-mono text-db-label">{e.test_key}</td>
                          <td className={cn('px-2 py-1.5', TYPE_COLOR[e.test_type])}>{e.test_type}</td>
                          <td className={cn('px-2 py-1.5', PRIORITY_COLOR[e.priority])}>{e.priority}</td>
                          <td className="px-2 py-1.5 text-db-muted">{e.program_name}</td>
                          <td className="px-2 py-1.5 text-db-muted">{e.env_name}</td>
                          <td className="px-2 py-1.5 text-db-muted">{e.release_name}</td>
                          <td className="px-2 py-1.5">
                            <span className={cn('inline-block px-1.5 py-0.5 rounded border text-[8px] font-medium', STATUS_BADGE[e.status] ?? '')}>
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
