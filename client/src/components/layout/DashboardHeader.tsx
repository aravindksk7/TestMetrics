import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { RefreshCw, Zap, Settings } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AppConfig { last_synced_at: string | null }

const NAV_LINKS = [
  { path: '/portfolio',    label: 'Portfolio' },
  { path: '/efficiency',   label: 'Efficiency' },
  { path: '/traceability', label: 'Traceability' },
  { path: '/stability',    label: 'Stability' },
  { path: '/drilldown',    label: 'Drill-Through' },
]

export default function DashboardHeader() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [refreshing, setRefreshing] = useState(false)
  const [lastSync,   setLastSync]   = useState<string | null>(null)

  useEffect(() => {
    ;(api.admin.getConfig() as Promise<AppConfig>)
      .then((c) => setLastSync(c.last_synced_at))
      .catch(() => {})
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const { job_id } = await api.admin.ingest('xlsx') as { job_id: string }
      const poll = setInterval(async () => {
        const job = await api.admin.jobStatus(job_id) as { status: string }
        if (job.status !== 'running') {
          clearInterval(poll)
          setRefreshing(false)
          setLastSync(new Date().toISOString())
          window.location.reload()
        }
      }, 3000)
    } catch {
      setRefreshing(false)
    }
  }

  function fmtSync(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleString('en-AU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <header className="bg-db-header px-4 py-0 flex items-center justify-between min-h-[44px]">
      {/* Left: brand + nav */}
      <div className="flex items-center gap-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 pr-4 py-3 text-white hover:text-white/80 transition-colors"
        >
          <Zap className="h-4 w-4" />
          <span className="font-semibold text-[13px] tracking-tight whitespace-nowrap">Xray Test Metrics</span>
        </button>
        <span className="text-white/30 mr-1">|</span>
        {NAV_LINKS.map(({ path, label }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'px-3 py-3 text-[11px] font-medium transition-colors whitespace-nowrap border-b-2',
                active
                  ? 'text-white border-[#f2a900]'
                  : 'text-white/60 hover:text-white border-transparent'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Right: sync info + actions */}
      <div className="flex items-center gap-2 pl-4">
        {lastSync && (
          <span className="text-[10px] text-blue-200/70 whitespace-nowrap">
            Synced {fmtSync(lastSync)}
          </span>
        )}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white transition-colors',
            location.pathname === '/settings' ? 'bg-white/20' : ''
          )}
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  )
}
