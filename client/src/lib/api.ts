import type { FilterState } from '@/types/metrics'

type ActiveFilters = Partial<FilterState>

export async function get<T>(path: string, filters: ActiveFilters = {}): Promise<T> {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][]
  )
  const url = `${path}${params.toString() ? '?' + params.toString() : ''}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText} — ${url}`)
  return res.json() as Promise<T>
}

export const api = {
  filters: {
    releases:     ()           => get('/api/filters/releases'),
    programs:     ()           => get('/api/filters/programs'),
    applications: (programId?: string) =>
      get('/api/filters/applications', programId ? { program_id: programId } : {}),
    environments: ()           => get('/api/filters/environments'),
    dateRange:    ()           => get('/api/filters/date-range'),
  },
  metrics: {
    kpis:              (f: ActiveFilters) => get('/api/metrics/kpis',                f),
    passRateTrend:     (f: ActiveFilters) => get('/api/metrics/pass-rate-trend',     f),
    outcomesByRelease: (f: ActiveFilters) => get('/api/metrics/outcomes-by-release', f),
    heatmap:           (f: ActiveFilters) => get('/api/metrics/heatmap',             f),
    releaseSummary:    (f: ActiveFilters) => get('/api/metrics/release-summary',     f),
    defectTrend:       (f: ActiveFilters) => get('/api/metrics/defect-trend',        f),
  },
  releases: {
    summary:   (id: number | string) => get(`/api/releases/${id}`),
    breakdown: (id: number | string) => get(`/api/releases/${id}/breakdown`),
    trend:     (id: number | string) => get(`/api/releases/${id}/trend`),
    defects:   (id: number | string) => get(`/api/releases/${id}/defects`),
  },
  efficiency: {
    kpis:           () => get('/api/efficiency/kpis'),
    throughput:     () => get('/api/efficiency/throughput'),
    automationSplit:() => get('/api/efficiency/automation-split'),
    flakyTests:     () => get('/api/efficiency/flaky-tests'),
  },
  traceability: {
    kpis:              () => get('/api/traceability/kpis'),
    coverageByRelease: () => get('/api/traceability/coverage-release'),
    coverageByPriority:() => get('/api/traceability/coverage-priority'),
    uncovered:         () => get('/api/traceability/uncovered'),
    reqPerformance:    () => get('/api/traceability/req-performance'),
  },
  stability: {
    kpis:         () => get('/api/stability/kpis'),
    summary:      () => get('/api/stability/summary'),
    blockedTrend: () => get('/api/stability/blocked-trend'),
    programEnv:   () => get('/api/stability/program-env'),
  },
  drilldown: {
    kpis:        (f: ActiveFilters) => get('/api/drilldown/kpis',         f),
    topFailing:  (f: ActiveFilters) => get('/api/drilldown/top-failing',  f),
    flakyTests:  (f: ActiveFilters) => get('/api/drilldown/flaky',        f),
    recent:      (f: ActiveFilters) => get('/api/drilldown/recent',       f),
    typeSummary: (f: ActiveFilters) => get('/api/drilldown/type-summary', f),
  },
  portfolio: {
    programHealth:    () => get('/api/portfolio/program-health'),
    coverage:         () => get('/api/portfolio/coverage'),
    programTrend:     () => get('/api/portfolio/program-trend'),
    appHealth:        () => get('/api/portfolio/app-health'),
    defectsByProgram: () => get('/api/portfolio/defects-by-program'),
  },
  admin: {
    ingest: (source: 'xlsx' | 'xray') =>
      fetch('/api/admin/ingest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ source }),
      }).then((r) => r.json()),
    jobStatus:  (jobId: string) => get(`/api/admin/ingest/${jobId}`),
    history:    ()              => get('/api/admin/ingest/history'),
    getConfig:  ()              => get('/api/admin/config'),
    saveConfig: (body: Record<string, string>) =>
      fetch('/api/admin/config', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }).then((r) => r.json()),
    testConnection: () =>
      fetch('/api/admin/config/test', { method: 'POST' }).then((r) => r.json()),
  },
}
