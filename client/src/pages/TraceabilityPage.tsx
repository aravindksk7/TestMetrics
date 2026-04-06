import { useNavigate } from 'react-router-dom'
import { ArrowLeft, GitMerge } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorWidget from '@/components/dashboard/ErrorWidget'
import { cn } from '@/lib/utils'
import {
  useTraceabilityKpis, useCoverageByRelease, useCoverageByPriority,
  useUncoveredRequirements, useReqPerformance,
} from '@/hooks/useTraceability'
import type { UncoveredRequirement, ReqPerformance } from '@/types/metrics'

const PRIORITY_COLOR: Record<string, string> = {
  High: 'text-fail', Medium: 'text-blocked', Low: 'text-db-muted',
}
const PRIORITY_BADGE: Record<string, string> = {
  High:   'bg-fail/20 text-fail border-fail/30',
  Medium: 'bg-blocked/20 text-blocked border-blocked/30',
  Low:    'bg-db-row text-db-muted border-db-border',
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

function cellPassColor(pct: number) {
  if (pct >= 80) return '#4ec77a'
  if (pct >= 60) return '#f2a900'
  return '#e05c5c'
}

export default function TraceabilityPage() {
  const navigate = useNavigate()
  const kpis     = useTraceabilityKpis()
  const byRel    = useCoverageByRelease()
  const byPri    = useCoverageByPriority()
  const uncov    = useUncoveredRequirements()
  const reqPerf  = useReqPerformance()

  const k = kpis.data

  const relData = (byRel.data?.releases ?? []).map((rel, i) => ({
    release:     rel,
    Covered:     byRel.data!.covered[i],
    Uncovered:   byRel.data!.uncovered[i],
    coverage_pct: byRel.data!.coverage_pct[i],
  }))

  return (
    <div className="min-h-screen bg-db-base">
      <header className="bg-db-header px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-[11px]">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
          <span className="text-white/40">|</span>
          <GitMerge className="h-4 w-4 text-white" />
          <span className="text-white font-semibold text-[15px] tracking-tight">
            Xray Test Metrics&nbsp;&nbsp;|&nbsp;&nbsp;Requirement Traceability
          </span>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-2 px-3.5 pt-2.5 pb-1.5">
        <KpiTile label="Total Requirements"  value={k?.total_requirements ?? '—'} accent="#0078d4" isLoading={kpis.isLoading} />
        <KpiTile label="Covered"             value={k?.covered ?? '—'}            accent="#4ec77a" isLoading={kpis.isLoading} />
        <KpiTile label="Uncovered"           value={k?.uncovered ?? '—'}          accent="#e05c5c" isLoading={kpis.isLoading} alert={!!k && k.uncovered > 0} />
        <KpiTile label="Portfolio Coverage"  value={k ? `${k.coverage_pct}%` : '—'} accent="#4ec77a" isLoading={kpis.isLoading} />
        <KpiTile label="High-Priority Gaps"  value={k?.high_priority_gaps ?? '—'} accent="#e05c5c" isLoading={kpis.isLoading} alert={!!k && k.high_priority_gaps > 0} sub="Active/Planning releases" />
      </div>

      {/* Coverage by Release + by Priority */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pb-2">
        <Card>
          <CardHeader><CardTitle>Requirement Coverage by Release</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {byRel.error ? <ErrorWidget message={byRel.error.message} /> : (
              byRel.isLoading ? <Skeleton className="h-[220px]" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={relData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" vertical={false} />
                    <XAxis dataKey="release" tick={{ fill: '#7a8fa8', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#7a8fa8', fontSize: 8 }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: '#1a2636', border: '1px solid #2a3a4a', borderRadius: 4, fontSize: 10 }}
                      labelStyle={{ color: '#9ab' }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      formatter={(v: number, name: string, props) =>
                        name === 'Covered' ? [`${v} (${props.payload.coverage_pct}%)`, name] : [v, name]
                      }
                    />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="Covered"   stackId="a" fill="#4ec77a" radius={[0,0,0,0]}>
                      <LabelList dataKey="coverage_pct" position="top" formatter={(v: number) => `${v}%`}
                        style={{ fill: '#7a8fa8', fontSize: 8 }} />
                    </Bar>
                    <Bar dataKey="Uncovered" stackId="a" fill="#e05c5c" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Coverage % by Priority × Release</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {byPri.error ? <ErrorWidget message={byPri.error.message} /> : (
              byPri.isLoading ? <Skeleton className="h-[220px]" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byPri.data?.data ?? []} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" vertical={false} />
                    <XAxis dataKey="release" tick={{ fill: '#7a8fa8', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0,100]} tick={{ fill: '#7a8fa8', fontSize: 8 }} tickLine={false} axisLine={false}
                      width={28} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: '#1a2636', border: '1px solid #2a3a4a', borderRadius: 4, fontSize: 10 }}
                      labelStyle={{ color: '#9ab' }}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      formatter={(v: number, name: string) => [`${v}%`, name]}
                    />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="High"   fill="#e05c5c" radius={[0,0,0,0]} />
                    <Bar dataKey="Medium" fill="#f2a900" radius={[0,0,0,0]} />
                    <Bar dataKey="Low"    fill="#4ec77a" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Uncovered reqs + Req performance */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pb-4">
        <Card>
          <CardHeader><CardTitle>Uncovered Requirements</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {uncov.error ? <ErrorWidget message={uncov.error.message} /> : (
              uncov.isLoading ? <Skeleton className="h-[260px]" /> : (
                uncov.data?.requirements.length === 0 ? (
                  <p className="text-pass text-[10px] italic">All requirements are covered.</p>
                ) : (
                  <div className="overflow-auto max-h-[260px]">
                    <table className="w-full text-[9px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#1a2d40]">
                          {['Req Key','Priority','Uncovered In'].map((h) => (
                            <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(uncov.data?.requirements ?? []).map((r: UncoveredRequirement, i) => (
                          <tr key={r.req_key} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
                            <td className="px-2 py-1.5 font-mono text-db-label">{r.req_key}</td>
                            <td className="px-2 py-1.5">
                              <span className={cn('inline-block px-1.5 py-0.5 rounded border text-[8px] font-medium', PRIORITY_BADGE[r.priority])}>
                                {r.priority}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-db-muted">{r.uncovered_in_releases}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Test Pass Rate per Requirement (Worst 20)</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {reqPerf.error ? <ErrorWidget message={reqPerf.error.message} /> : (
              reqPerf.isLoading ? <Skeleton className="h-[260px]" /> : (
                <div className="overflow-auto max-h-[260px]">
                  <table className="w-full text-[9px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#1a2d40]">
                        {['Req','Priority','Linked Tests','Executions','Pass %','Fail %'].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(reqPerf.data?.requirements ?? []).map((r: ReqPerformance, i) => (
                        <tr key={r.req_key} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
                          <td className="px-2 py-1.5 font-mono text-db-label">{r.req_key}</td>
                          <td className={cn('px-2 py-1.5 font-medium', PRIORITY_COLOR[r.priority])}>{r.priority}</td>
                          <td className="px-2 py-1.5 text-db-muted tabular-nums">{r.linked_tests}</td>
                          <td className="px-2 py-1.5 text-db-muted tabular-nums">{r.total_execs}</td>
                          <td className="px-2 py-1.5">
                            <span className="font-bold tabular-nums" style={{ color: cellPassColor(r.pass_rate) }}>
                              {r.pass_rate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-fail tabular-nums">{r.fail_rate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[8px] italic text-db-muted mt-1 px-1">
                    Sorted by pass rate ascending · shows requirements with weakest test outcomes
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
