// ── Filter options ────────────────────────────────────────────

export interface Release     { release_id: number; release_name: string; release_date: string; status: string }
export interface Program     { program_id: number; program_name: string }
export interface Application { app_id: number; app_name: string; program_id: number }
export interface Environment { env_id: number; env_name: string }
export interface DateRange   { min_date: string; max_date: string }

// ── Filter state ──────────────────────────────────────────────

export interface FilterState {
  release_id:  string
  program_id:  string
  app_id:      string
  env_id:      string
  date_from:   string
  date_to:     string
}

// ── KPIs ─────────────────────────────────────────────────────

export type TrendDirection = 'up' | 'down' | 'neutral'

export interface KpiValue {
  value:           number
  trend_direction: TrendDirection
  trend_label:     string
}

export interface KpisResponse {
  rri:                   KpiValue
  pass_rate:             KpiValue
  requirement_coverage:  KpiValue
  open_critical_defects: KpiValue
  blocked_pct:           KpiValue
}

// ── Charts ────────────────────────────────────────────────────

export interface TrendResponse {
  labels: string[]
  values: number[]
}

export interface OutcomesResponse {
  releases: string[]
  series: {
    passed:  number[]
    failed:  number[]
    blocked: number[]
  }
}

export type HeatmapColor = 'green' | 'amber' | 'red'

export interface HeatmapCell {
  program:     string
  environment: string
  fail_rate:   number
  color:       HeatmapColor
}

export interface HeatmapResponse {
  programs:     string[]
  environments: string[]
  cells:        HeatmapCell[]
}

export type RriColor = 'green' | 'amber' | 'red'

export interface ReleaseSummaryRow {
  release_name:     string
  pass_pct:         number
  fail_pct:         number
  blocked_pct:      number
  rri:              number
  critical_defects: number
  rri_color:        RriColor
}

export interface ReleaseSummaryResponse {
  releases: ReleaseSummaryRow[]
}

// ── Defect Trend ──────────────────────────────────────────────

export interface DefectTrendResponse {
  labels:        string[]
  open_critical: number[]
  open_high:     number[]
}

// ── Release Detail ────────────────────────────────────────────

export interface ReleaseDetail {
  release_id:       number
  release_name:     string
  release_date:     string
  status:           string
  rri:              number
  pass_pct:         number
  fail_pct:         number
  blocked_pct:      number
  coverage_pct:     number
  total_executions: number
  open_critical:    number
  total_defects:    number
}

export interface BreakdownCell {
  program:     string
  env:         string
  total:       number
  passed:      number
  failed:      number
  blocked:     number
  pass_pct:    number
  fail_pct:    number
  blocked_pct: number
}

export interface ReleaseBreakdownResponse {
  programs:     string[]
  environments: string[]
  cells:        BreakdownCell[]
}

export interface ReleaseTrendResponse {
  labels: string[]
  values: number[]
}

export interface Defect {
  id:            number
  program:       string
  severity:      'Critical' | 'High' | 'Medium' | 'Low'
  status:        string
  created_date:  string | null
  resolved_date: string | null
  age_days:      number
}

export interface ReleaseDefectsResponse {
  defects: Defect[]
}

// ── Portfolio ─────────────────────────────────────────────────

export type HealthColor = 'green' | 'amber' | 'red'

export interface ProgramHealth {
  program_id:       number
  program_name:     string
  total_executions: number
  pass_pct:         number
  fail_pct:         number
  blocked_pct:      number
  open_critical:    number
  open_defects:     number
  total_defects:    number
  health:           HealthColor
}

export interface PortfolioSummary {
  total_executions: number
  pass_pct:         number
  open_critical:    number
  programs_at_risk: number
}

export interface ProgramHealthResponse {
  programs:  ProgramHealth[]
  portfolio: PortfolioSummary
}

export interface AppHealth {
  app_id:           number
  app_name:         string
  program_name:     string
  total_executions: number
  pass_pct:         number
  fail_pct:         number
  blocked_pct:      number
  health:           HealthColor
}

export interface AppHealthResponse {
  apps: AppHealth[]
}

export interface ProgramTrendResponse {
  weeks:    string[]
  programs: string[]
  data:     Record<string, number | string>[]
}

export interface DefectsByProgramResponse {
  programs: string[]
  series: {
    critical: number[]
    high:     number[]
    medium:   number[]
    low:      number[]
  }
}

// ── P3 Efficiency ─────────────────────────────────────────────

export interface EfficiencyKpis {
  total_executions: number
  avg_per_week:     number
  automation_pct:   number
  flaky_tests:      number
  rerun_count:      number
}

export interface ThroughputResponse {
  labels:    string[]
  total:     number[]
  automated: number[]
  cucumber:  number[]
  manual:    number[]
  generic:   number[]
}

export interface AutomationSplitResponse {
  types:       string[]
  test_counts: number[]
  exec_counts: number[]
}

export interface FlakyTest {
  test_key:          string
  test_type:         string
  priority:          string
  total_execs:       number
  pass_count:        number
  fail_count:        number
  fail_rate:         number
  releases_affected: number
  envs_affected:     number
}

export interface FlakyTestsResponse {
  tests: FlakyTest[]
}

// ── P4 Traceability ───────────────────────────────────────────

export interface TraceabilityKpis {
  total_requirements: number
  covered:            number
  uncovered:          number
  coverage_pct:       number
  high_priority_gaps: number
}

export interface CoverageByReleaseResponse {
  releases:     string[]
  covered:      number[]
  uncovered:    number[]
  total:        number[]
  coverage_pct: number[]
}

export interface CoverageByPriorityResponse {
  releases: string[]
  data:     { release: string; High: number; Medium: number; Low: number }[]
}

export interface UncoveredRequirement {
  req_key:               string
  req_summary:           string
  priority:              string
  uncovered_in_releases: string
  release_count:         number
}

export interface UncoveredRequirementsResponse {
  requirements: UncoveredRequirement[]
}

export interface ReqPerformance {
  req_key:      string
  priority:     string
  linked_tests: number
  total_execs:  number
  pass_rate:    number
  fail_rate:    number
}

export interface ReqPerformanceResponse {
  requirements: ReqPerformance[]
}

// ── P5 Stability ──────────────────────────────────────────────

export interface StabilityKpis {
  most_unstable_env: string
  most_stable_env:   string
  avg_blocked_pct:   number
  sit_instability:   number
  prod_instability:  number
}

export interface EnvSummaryRow {
  env_name:           string
  total_execs:        number
  pass_pct:           number
  fail_pct:           number
  blocked_pct:        number
  in_progress_pct:    number
  instability_score:  number
  color:              HealthColor
}

export interface EnvSummaryResponse {
  environments: EnvSummaryRow[]
}

export interface EnvBlockedTrendResponse {
  weeks: string[]
  envs:  string[]
  data:  Record<string, number | string>[]
}

export interface ProgramEnvCell {
  program:     string
  env:         string
  blocked_pct: number
  fail_pct:    number
  total:       number
  color:       HealthColor
}

export interface ProgramEnvStabilityResponse {
  programs: string[]
  envs:     string[]
  cells:    ProgramEnvCell[]
}

// ── P6 Drilldown ──────────────────────────────────────────────

export interface DrilldownKpis {
  total_execs:    number
  unique_tests:   number
  fail_pct:       number
  blocked_pct:    number
  automation_pct: number
}

export interface FailingTest {
  test_key:       string
  test_type:      string
  priority:       string
  total_execs:    number
  failures:       number
  passes:         number
  blocked:        number
  fail_rate:      number
  programs:       string
  envs_count:     number
  releases_count: number
}

export interface FailingTestsResponse {
  tests: FailingTest[]
}

export interface DrillFlakyTest {
  test_key:      string
  test_type:     string
  priority:      string
  total_execs:   number
  passes:        number
  failures:      number
  blocked_count: number
  fail_rate:     number
  environments:  string
}

export interface DrillFlakyResponse {
  tests: DrillFlakyTest[]
}

export interface ExecutionRecord {
  test_key:       string
  test_type:      string
  priority:       string
  program_name:   string
  env_name:       string
  release_name:   string
  status:         string
  execution_date: string
}

export interface RecentExecutionsResponse {
  executions: ExecutionRecord[]
}

export interface TypeSummaryRow {
  test_type: string
  total:     number
  passed:    number
  failed:    number
  blocked:   number
  pass_pct:  number
}

export interface TypeSummaryResponse {
  types: TypeSummaryRow[]
}
