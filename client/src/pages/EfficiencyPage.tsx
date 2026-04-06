import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, Activity } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorWidget from '@/components/dashboard/ErrorWidget'
import { cn } from '@/lib/utils'
import { useEfficiencyKpis, useThroughput, useAutomationSplit, useEfficiencyFlaky } from '@/hooks/useEfficiency'
import type { FlakyTest } from '@/types/metrics'

const TYPE_COLORS: Record<string, string> = {
  Automated: '#4ec77a',
  Cucumber:  '#0078d4',
  Manual:    '#f2a900',
  Generic:   '#7a8fa8',
}
const PRIORITY_COLOR: Record<string, string> = {
  High: 'text-fail', Medium: 'text-blocked', Low: 'text-db-muted',
}

function KpiTile({ label, value, sub, accent, isLoading, alert }: {
  label: string; value: string | number; sub?: string
  accent: string; isLoading: boolean; alert?: boolean
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

export default function EfficiencyPage() {
  const navigate = useNavigate()
  const kpis   = useEfficiencyKpis()
  const thru   = useThroughput()
  const split  = useAutomationSplit()
  const flaky  = useEfficiencyFlaky()

  const k = kpis.data

  // Build throughput chart data
  const thruData = (thru.data?.labels ?? []).map((label, i) => ({
    label,
    Automated: thru.data!.automated[i],
    Cucumber:  thru.data!.cucumber[i],
    Manual:    thru.data!.manual[i],
    Generic:   thru.data!.generic[i],
  }))

  // Automation donut
  const donutData = (split.data?.types ?? []).map((type, i) => ({
    name:  type,
    value: split.data!.exec_counts[i],
    color: TYPE_COLORS[type] ?? '#666',
  }))

  return (
    <div className="min-h-screen bg-db-base">
      <header className="bg-db-header px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-[11px]">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
          <span className="text-white/40">|</span>
          <Activity className="h-4 w-4 text-white" />
          <span className="text-white font-semibold text-[15px] tracking-tight">
            Xray Test Metrics&nbsp;&nbsp;|&nbsp;&nbsp;Execution Efficiency &amp; Throughput
          </span>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-2 px-3.5 pt-2.5 pb-1.5">
        <KpiTile label="Total Executions"  value={k?.total_executions.toLocaleString() ?? '—'} accent="#0078d4" isLoading={kpis.isLoading} />
        <KpiTile label="Avg Execs / Week"  value={k?.avg_per_week ?? '—'}                       accent="#4ec77a" isLoading={kpis.isLoading} />
        <KpiTile label="Automation %"      value={k ? `${k.automation_pct}%` : '—'}             accent="#4ec77a" isLoading={kpis.isLoading} sub="Automated + Cucumber" />
        <KpiTile label="Flaky Tests"       value={k?.flaky_tests ?? '—'}                         accent="#f2a900" isLoading={kpis.isLoading} alert={!!k && k.flaky_tests > 0} />
        <KpiTile label="Total Reruns"      value={k?.rerun_count.toLocaleString() ?? '—'}        accent="#e05c5c" isLoading={kpis.isLoading} sub="Extra executions of same test" />
      </div>

      {/* Throughput + Donut */}
      <div className="grid grid-cols-3 gap-2 px-3.5 pb-2">
        <div className="col-span-2">
          <Card>
            <CardHeader><CardTitle>Weekly Execution Throughput by Test Type</CardTitle></CardHeader>
            <CardContent className="pb-3">
              {thru.error ? <ErrorWidget message={thru.error.message} /> : (
                thru.isLoading ? <Skeleton className="h-[220px]" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={thruData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
                      <XAxis dataKey="label" tick={{ fill: '#7a8fa8', fontSize: 8 }}
                        interval={Math.floor(thruData.length / 8)} tickLine={false} />
                      <YAxis tick={{ fill: '#7a8fa8', fontSize: 8 }} tickLine={false} axisLine={false} width={28} />
                      <Tooltip contentStyle={{ background: '#1a2636', border: '1px solid #2a3a4a', borderRadius: 4, fontSize: 10 }}
                        labelStyle={{ color: '#9ab' }} />
                      <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9 }} />
                      {['Automated','Cucumber','Manual','Generic'].map((type) => (
                        <Area key={type} type="monotone" dataKey={type} stackId="a"
                          stroke={TYPE_COLORS[type]} fill={TYPE_COLORS[type]} fillOpacity={0.5} strokeWidth={1} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                )
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Automation Leverage</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {split.error ? <ErrorWidget message={split.error.message} /> : (
              split.isLoading ? <Skeleton className="h-[220px]" /> : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                        dataKey="value" nameKey="name" paddingAngle={2}>
                        {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a2636', border: '1px solid #2a3a4a', borderRadius: 4, fontSize: 10 }}
                        formatter={(v: number, name: string) => [v.toLocaleString(), name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 w-full mt-1">
                    {donutData.map((d) => {
                      const total = donutData.reduce((s, x) => s + x.value, 0)
                      return (
                        <div key={d.name} className="flex items-center justify-between text-[9px]">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-db-label">{d.name}</span>
                          </div>
                          <span className="text-db-muted tabular-nums">
                            {d.value.toLocaleString()} ({Math.round(d.value / total * 100)}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Flaky / Churn Table */}
      <div className="px-3.5 pb-4">
        <Card>
          <CardHeader>
            <CardTitle>Flaky &amp; Churning Tests — Top 25 by Fail Rate</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {flaky.error ? <ErrorWidget message={flaky.error.message} /> : (
              flaky.isLoading ? <Skeleton className="h-[260px]" /> : (
                <div className="overflow-auto max-h-[300px]">
                  <table className="w-full text-[9px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#1a2d40]">
                        {['Test Key','Type','Priority','Total Execs','Passes','Failures','Fail %','Releases','Envs'].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(flaky.data?.tests ?? []).map((t: FlakyTest, i) => (
                        <tr key={t.test_key} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
                          <td className="px-2 py-1.5 font-mono text-db-label">{t.test_key}</td>
                          <td className="px-2 py-1.5 text-db-muted">{t.test_type}</td>
                          <td className={cn('px-2 py-1.5 font-medium', PRIORITY_COLOR[t.priority])}>{t.priority}</td>
                          <td className="px-2 py-1.5 text-db-muted tabular-nums">{t.total_execs}</td>
                          <td className="px-2 py-1.5 text-pass tabular-nums">{t.pass_count}</td>
                          <td className="px-2 py-1.5 text-fail tabular-nums">{t.fail_count}</td>
                          <td className={cn('px-2 py-1.5 font-bold tabular-nums', t.fail_rate >= 40 ? 'text-fail' : t.fail_rate >= 25 ? 'text-blocked' : 'text-db-label')}>
                            {t.fail_rate.toFixed(1)}%
                          </td>
                          <td className="px-2 py-1.5 text-db-muted tabular-nums">{t.releases_affected}</td>
                          <td className="px-2 py-1.5 text-db-muted tabular-nums">{t.envs_affected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[8px] italic text-db-muted mt-1 px-1">
                    Flaky = test has both PASS and FAIL results within same release × environment
                  </p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
