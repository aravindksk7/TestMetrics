import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, LayoutGrid } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import ErrorWidget from '@/components/dashboard/ErrorWidget'
import ProgramHealthCards   from '@/components/portfolio/ProgramHealthCards'
import ProgramTrendChart    from '@/components/portfolio/ProgramTrendChart'
import AppHealthTable        from '@/components/portfolio/AppHealthTable'
import DefectsByProgramChart from '@/components/portfolio/DefectsByProgramChart'
import {
  useProgramHealth, usePortfolioCoverage,
  useProgramTrend, useAppHealth, useDefectsByProgram,
} from '@/hooks/usePortfolio'
import { cn } from '@/lib/utils'

interface KpiTileProps {
  label:     string
  value:     string | number
  sub?:      string
  accent:    string
  isLoading: boolean
  alert?:    boolean
}

function KpiTile({ label, value, sub, accent, isLoading, alert }: KpiTileProps) {
  if (isLoading) return <Skeleton className="h-[72px]" />
  return (
    <div
      className="bg-db-panel rounded border-t-2 px-3 py-2.5"
      style={{ borderColor: accent }}
    >
      <p className="text-[9px] text-db-muted uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-[26px] font-bold leading-none tabular-nums', alert ? 'text-fail' : 'text-white')}>
        {value}
      </p>
      {sub && <p className="text-[9px] text-db-muted mt-0.5">{sub}</p>}
    </div>
  )
}

export default function PortfolioPage() {
  const navigate = useNavigate()

  const health    = useProgramHealth()
  const coverage  = usePortfolioCoverage()
  const trend     = useProgramTrend()
  const appHealth = useAppHealth()
  const defects   = useDefectsByProgram()

  const p = health.data?.portfolio

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
          <LayoutGrid className="h-4 w-4 text-white" />
          <span className="text-white font-semibold text-[15px] tracking-tight">
            Xray Test Metrics&nbsp;&nbsp;|&nbsp;&nbsp;Portfolio Test Health
          </span>
        </div>
        <span className="text-blue-200 text-[10px]">
          All Releases · All Environments
        </span>
      </header>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-2 px-3.5 pt-2.5 pb-1.5">
        <KpiTile
          label="Total Executions"
          value={p ? p.total_executions.toLocaleString() : '—'}
          accent="#0078d4"
          isLoading={health.isLoading}
        />
        <KpiTile
          label="Portfolio Pass %"
          value={p ? `${p.pass_pct.toFixed(1)}%` : '—'}
          accent="#4ec77a"
          isLoading={health.isLoading}
        />
        <KpiTile
          label="Requirement Coverage"
          value={coverage.isLoading ? '—' : `${coverage.data?.coverage_pct?.toFixed(1) ?? 0}%`}
          accent="#0078d4"
          isLoading={coverage.isLoading}
        />
        <KpiTile
          label="Open Critical Defects"
          value={p ? p.open_critical : '—'}
          accent="#e05c5c"
          isLoading={health.isLoading}
          alert={!!p && p.open_critical > 0}
        />
        <KpiTile
          label="Programs at Risk"
          value={p ? p.programs_at_risk : '—'}
          sub="pass rate < 60%"
          accent="#f0a030"
          isLoading={health.isLoading}
          alert={!!p && p.programs_at_risk > 0}
        />
      </div>

      {/* Program Health Cards */}
      <div className="px-3.5 pb-2">
        <Card>
          <CardHeader><CardTitle>Program Health Scorecard</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {health.error
              ? <ErrorWidget message={health.error.message} />
              : <ProgramHealthCards programs={health.data?.programs ?? []} isLoading={health.isLoading} />
            }
          </CardContent>
        </Card>
      </div>

      {/* Trend + App Health */}
      <div className="grid grid-cols-2 gap-2 px-3.5 pb-2">
        <Card>
          <CardHeader><CardTitle>Pass Rate Trend by Program (Weekly)</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {trend.error
              ? <ErrorWidget message={trend.error.message} />
              : <ProgramTrendChart data={trend.data} isLoading={trend.isLoading} />
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Application Health — Sorted by Fail Rate</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {appHealth.error
              ? <ErrorWidget message={appHealth.error.message} />
              : <AppHealthTable data={appHealth.data} isLoading={appHealth.isLoading} />
            }
          </CardContent>
        </Card>
      </div>

      {/* Defects by Program */}
      <div className="px-3.5 pb-4">
        <Card>
          <CardHeader><CardTitle>Open Defects by Program &amp; Severity</CardTitle></CardHeader>
          <CardContent className="pb-3">
            {defects.error
              ? <ErrorWidget message={defects.error.message} />
              : <DefectsByProgramChart data={defects.data} isLoading={defects.isLoading} />
            }
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
