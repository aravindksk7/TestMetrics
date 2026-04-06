import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorWidget from '@/components/dashboard/ErrorWidget'
import { cn } from '@/lib/utils'
import { useStabilityKpis, useEnvSummary, useEnvBlockedTrend, useProgramEnv } from '@/hooks/useStability'
import type { EnvSummaryRow, ProgramEnvCell, HealthColor } from '@/types/metrics'

const ENV_COLORS: Record<string, string> = {
  DEV:  '#4ec77a',
  SIT:  '#e05c5c',
  UAT:  '#f2a900',
  PERF: '#0078d4',
  PROD: '#c77ae0',
}

const CELL_BG: Record<HealthColor, string> = {
  green: 'bg-[#1e2a20] text-pass',
  amber: 'bg-[#2a2218] text-blocked',
  red:   'bg-[#2a1e1e] text-fail',
}

const COLOR_DOT: Record<HealthColor, string> = {
  green: 'bg-pass', amber: 'bg-blocked', red: 'bg-fail',
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

export default function StabilityPage() {
  const navigate = useNavigate()
  const kpis  = useStabilityKpis()
  const summ  = useEnvSummary()
  const trend = useEnvBlockedTrend()
  const penv  = useProgramEnv()

  const k = kpis.data

  // Build program×env lookup
  const cellMap = new Map((penv.data?.cells ?? []).map((c: ProgramEnvCell) => [`${c.program}:${c.env}`, c]))

  return (
    <div className="min-h-screen bg-db-base">
      <header className="bg-db-header px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-[11px]">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
          <span className="text-white/40">|</span>
          <ShieldCheck className="h-4 w-4 text-white" />
          <span className="text-white font-semibold text-[15px] tracking-tight">
            Xray Test Metrics&nbsp;&nbsp;|&nbsp;&nbsp;Environment &amp; Data Stability
          </span>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-2 px-3.5 pt-2.5 pb-1.5">
        <KpiTile label="Most Unstable Env"  value={k?.most_unstable_env ?? '—'}              accent="#e05c5c" isLoading={kpis.isLoading} alert />
        <KpiTile label="Most Stable Env"    value={k?.most_stable_env ?? '—'}                accent="#4ec77a" isLoading={kpis.isLoading} />
        <KpiTile label="Avg Blocked %"      value={k ? `${k.avg_blocked_pct}%` : '—'}        accent="#f2a900" isLoading={kpis.isLoading} />
        <KpiTile label="SIT Instability"    value={k ? k.sit_instability.toFixed(1) : '—'}   accent="#e05c5c" isLoading={kpis.isLoading} sub="score /100" alert={!!k && k.sit_instability > 25} />
        <KpiTile label="PROD Instability"   value={k ? k.prod_instability.toFixed(1) : '—'}  accent="#4ec77a" isLoading={kpis.isLoading} sub="score /100" alert={!!k && k.prod_instability > 12} />
      </div>

      {/* Env Summary Table + Blocked Trend */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pb-2">
        <Card>
          <CardHeader><CardTitle>Environment Stability Summary</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {summ.error ? <ErrorWidget message={summ.error.message} /> : (
              summ.isLoading ? <Skeleton className="h-[220px]" /> : (
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="bg-[#1a2d40]">
                      {['Environment','Execs','Pass %','Fail %','Blocked %','Instability'].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(summ.data?.environments ?? []).map((e: EnvSummaryRow, i) => (
                      <tr key={e.env_name} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('inline-block w-2 h-2 rounded-full', COLOR_DOT[e.color])} />
                            <span className="font-medium text-db-label">{e.env_name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-db-muted tabular-nums">{e.total_execs.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-pass tabular-nums">{e.pass_pct.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-fail tabular-nums">{e.fail_pct.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-blocked tabular-nums">{e.blocked_pct.toFixed(1)}%</td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-14 bg-db-row rounded-full h-1.5 overflow-hidden">
                              <div className={cn('h-full rounded-full', e.color === 'green' ? 'bg-pass' : e.color === 'amber' ? 'bg-blocked' : 'bg-fail')}
                                style={{ width: `${Math.min(e.instability_score, 100)}%` }} />
                            </div>
                            <span className={cn('font-bold tabular-nums', e.color === 'green' ? 'text-pass' : e.color === 'amber' ? 'text-blocked' : 'text-fail')}>
                              {e.instability_score.toFixed(1)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="px-2 pt-1 text-[8px] italic text-db-muted">
                        Instability score = (Fail% × 0.5) + (Blocked% × 0.5) · Green &lt;12 · Amber 12–25 · Red &gt;25
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Weekly Blocked % Trend by Environment</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {trend.error ? <ErrorWidget message={trend.error.message} /> : (
              trend.isLoading ? <Skeleton className="h-[220px]" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trend.data?.data ?? []} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
                    <XAxis dataKey="week" tick={{ fill: '#7a8fa8', fontSize: 8 }}
                      interval={Math.floor((trend.data?.data?.length ?? 1) / 5)} tickLine={false} />
                    <YAxis tick={{ fill: '#7a8fa8', fontSize: 8 }} tickFormatter={(v) => `${v}%`}
                      tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      contentStyle={{ background: '#1a2636', border: '1px solid #2a3a4a', borderRadius: 4, fontSize: 10 }}
                      labelStyle={{ color: '#9ab' }}
                      formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                    />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
                    {(trend.data?.envs ?? []).map((env) => (
                      <Line key={env} type="monotone" dataKey={env}
                        stroke={ENV_COLORS[env] ?? '#7a8fa8'}
                        strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Program × Env Stability Heatmap */}
      <div className="px-3.5 pb-4">
        <Card>
          <CardHeader><CardTitle>Program × Environment — Blocked % Heatmap</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {penv.error ? <ErrorWidget message={penv.error.message} /> : (
              penv.isLoading ? <Skeleton className="h-[160px]" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[9px]">
                    <thead>
                      <tr className="bg-[#1a2d40]">
                        <th className="px-3 py-1.5 text-left font-semibold text-db-label">Program</th>
                        {(penv.data?.envs ?? []).map((env) => (
                          <th key={env} className="px-3 py-1.5 text-center font-semibold text-db-label"
                            style={{ color: ENV_COLORS[env] }}>{env}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(penv.data?.programs ?? []).map((prog, pi) => (
                        <tr key={prog} className={cn('border-b border-db-border/30', pi % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
                          <td className="px-3 py-1.5 font-medium text-db-label">{prog}</td>
                          {(penv.data?.envs ?? []).map((env) => {
                            const cell = cellMap.get(`${prog}:${env}`) as ProgramEnvCell | undefined
                            if (!cell) return <td key={env} className="px-3 py-1.5 text-center text-db-muted">—</td>
                            return (
                              <td key={env} className={cn('px-3 py-2 text-center font-bold rounded-sm', CELL_BG[cell.color])}>
                                {cell.blocked_pct.toFixed(1)}%
                                <span className="block text-[8px] font-normal opacity-70">
                                  fail {cell.fail_pct.toFixed(1)}%
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={(penv.data?.envs.length ?? 0) + 1} className="px-2 pt-1 text-[8px] italic text-db-muted">
                          Cell shows blocked % (primary) and fail % · Green &lt;12 · Amber 12–25 · Red &gt;25 instability score
                        </td>
                      </tr>
                    </tfoot>
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
