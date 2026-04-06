import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, Save, Wifi, RefreshCw, Upload, Download } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Config {
  jira_base_url:      string
  jira_project_key:   string
  xray_auth_mode:     string
  jira_user_email:    string
  jira_api_token:     string
  xray_client_id:     string
  xray_client_secret: string
  last_synced_at:     string | null
  last_sync_rows:     string | null
  last_sync_status:   string | null
}

interface Job {
  job_id:         string
  source:         string
  status:         string
  started_at:     string
  completed_at:   string | null
  rows_processed: number | null
  duration_ms:    number | null
  errors:         string[]
}

const EMPTY: Config = {
  jira_base_url:      '',
  jira_project_key:   '',
  xray_auth_mode:     'server',
  jira_user_email:    '',
  jira_api_token:     '',
  xray_client_id:     '',
  xray_client_secret: '',
  last_synced_at:     null,
  last_sync_rows:     null,
  last_sync_status:   null,
}

function statusColor(s: string) {
  if (s === 'done')    return 'text-pass'
  if (s === 'error')   return 'text-fail'
  if (s === 'running') return 'text-blocked'
  return 'text-db-muted'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [cfg, setCfg]           = useState<Config>(EMPTY)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [testing, setTesting]   = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [jobs, setJobs]         = useState<Job[]>([])
  const [ingesting, setIngesting]   = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      (api.admin.getConfig() as Promise<Config>).then((c) => setCfg(c)),
      (api.admin.history()   as Promise<{ jobs: Job[] }>).then((r) => setJobs(r.jobs)),
    ]).finally(() => setLoading(false))
  }, [])

  function change(key: keyof Config) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setCfg((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const body: Record<string, string> = {
        jira_base_url:      cfg.jira_base_url,
        jira_project_key:   cfg.jira_project_key,
        xray_auth_mode:     cfg.xray_auth_mode,
        jira_user_email:    cfg.jira_user_email,
        jira_api_token:     cfg.jira_api_token,
        xray_client_id:     cfg.xray_client_id,
        xray_client_secret: cfg.xray_client_secret,
      }
      await api.admin.saveConfig(body)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await api.admin.testConnection() as { ok: boolean; message: string; error?: string }
      setTestResult({ ok: r.ok ?? false, message: r.message ?? r.error ?? 'Unknown result' })
    } catch (err: unknown) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  async function pollJob(job_id: string) {
    return new Promise<void>((resolve) => {
      const poll = setInterval(async () => {
        try {
          const job = await api.admin.jobStatus(job_id) as Job
          if (job.status !== 'running') {
            clearInterval(poll)
            setIngesting(false)
            const history = await api.admin.history() as { jobs: Job[] }
            setJobs(history.jobs)
            setCfg((prev) => ({
              ...prev,
              last_synced_at:   new Date().toISOString(),
              last_sync_rows:   String(job.rows_processed ?? 0),
              last_sync_status: job.status,
            }))
            resolve()
          }
        } catch { clearInterval(poll); setIngesting(false); resolve() }
      }, 2000)
    })
  }

  async function handleUpload() {
    if (!uploadFile) { fileInputRef.current?.click(); return }
    setIngesting(true)
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      const res = await fetch('/api/admin/ingest/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
      const { job_id } = await res.json() as { job_id: string }
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await pollJob(job_id)
    } catch (err: unknown) {
      console.error(err)
      setIngesting(false)
    }
  }

  async function handleIngest(source: 'xray') {
    setIngesting(true)
    try {
      const { job_id } = await api.admin.ingest(source) as { job_id: string }
      await pollJob(job_id)
    } catch {
      setIngesting(false)
    }
  }

  const isCloud = cfg.xray_auth_mode === 'cloud'

  const inputCls = 'w-full bg-db-row border border-db-border rounded px-2.5 py-1.5 text-[11px] text-db-label placeholder-db-muted focus:outline-none focus:border-[#0078d4] transition-colors'
  const labelCls = 'block text-[10px] font-medium text-db-muted mb-1'

  if (loading) {
    return (
      <div className="min-h-screen bg-db-base flex items-center justify-center text-db-muted text-[12px]">
        Loading…
      </div>
    )
  }

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
            Xray Test Metrics&nbsp;&nbsp;|&nbsp;&nbsp;Settings
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cfg.last_synced_at && (
            <span className="text-blue-200 text-[10px]">
              Last sync: {fmtDate(cfg.last_synced_at)}
              {cfg.last_sync_rows ? ` · ${cfg.last_sync_rows} rows` : ''}
            </span>
          )}
        </div>
      </header>

      <div className="px-3.5 pt-3 pb-6 grid grid-cols-2 gap-3">

        {/* Connection settings */}
        <Card>
          <CardHeader>
            <CardTitle>Xray / Jira Connection</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            <div>
              <label className={labelCls}>Jira Base URL</label>
              <input
                className={inputCls}
                placeholder="https://your-org.atlassian.net"
                value={cfg.jira_base_url}
                onChange={change('jira_base_url')}
              />
            </div>
            <div>
              <label className={labelCls}>Jira Project Key</label>
              <input
                className={inputCls}
                placeholder="PROJ"
                value={cfg.jira_project_key}
                onChange={change('jira_project_key')}
              />
            </div>
            <div>
              <label className={labelCls}>Auth Mode</label>
              <select
                className={inputCls}
                value={cfg.xray_auth_mode}
                onChange={change('xray_auth_mode')}
              >
                <option value="server">Jira Server / Data Center (Basic Auth)</option>
                <option value="cloud">Xray Cloud (Client Credentials)</option>
              </select>
            </div>

            {!isCloud ? (
              <>
                <div>
                  <label className={labelCls}>Jira User Email</label>
                  <input
                    className={inputCls}
                    type="email"
                    placeholder="user@example.com"
                    value={cfg.jira_user_email}
                    onChange={change('jira_user_email')}
                  />
                </div>
                <div>
                  <label className={labelCls}>API Token / Password</label>
                  <input
                    className={inputCls}
                    type="password"
                    placeholder="••••••••"
                    value={cfg.jira_api_token}
                    onChange={change('jira_api_token')}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={labelCls}>Xray Client ID</label>
                  <input
                    className={inputCls}
                    placeholder="client_id"
                    value={cfg.xray_client_id}
                    onChange={change('xray_client_id')}
                  />
                </div>
                <div>
                  <label className={labelCls}>Xray Client Secret</label>
                  <input
                    className={inputCls}
                    type="password"
                    placeholder="••••••••"
                    value={cfg.xray_client_secret}
                    onChange={change('xray_client_secret')}
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium bg-[#0078d4] hover:bg-[#006abc] text-white disabled:opacity-50 transition-colors"
              >
                <Save className="h-3 w-3" />
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
              </button>
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors"
              >
                <Wifi className="h-3 w-3" />
                {testing ? 'Testing…' : 'Test Connection'}
              </button>
            </div>
            {testResult && (
              <p className={cn('text-[10px] mt-1', testResult.ok ? 'text-pass' : 'text-fail')}>
                {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ingestion */}
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Manual Ingestion</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] text-db-muted">
                  Upload an XLSX file to ingest, or trigger a live Xray API sync.
                </p>
                <a
                  href="/api/admin/ingest/sample-xlsx"
                  download="xray_import_sample.xlsx"
                  className="flex items-center gap-1 text-[10px] text-[#0078d4] hover:text-white transition-colors whitespace-nowrap ml-4"
                >
                  <Download className="h-3 w-3" />
                  Download sample XLSX
                </a>
              </div>

              {/* Schema reference */}
              <div className="mb-3 rounded border border-db-border bg-db-row p-2 text-[9px] text-db-muted space-y-1">
                <p className="font-semibold text-db-label mb-1">Required sheets &amp; columns</p>
                {[
                  { sheet: 'Executions',   cols: 'Test Key · Fix Version · Program · Environment · Component · Execution Status · Executed On' },
                  { sheet: 'Requirements', cols: 'Requirement Key · Summary · Priority · Fix Version · Linked Test' },
                  { sheet: 'Defects',      cols: 'Fix Version · Program · Priority · Status · Created · Resolved' },
                  { sheet: 'Releases',     cols: 'Release · Version · Release Date · Status' },
                ].map(({ sheet, cols }) => (
                  <div key={sheet} className="flex gap-2">
                    <span className="text-db-label font-medium w-24 shrink-0">{sheet}</span>
                    <span className="text-db-muted">{cols}</span>
                  </div>
                ))}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />

              {/* XLSX upload row */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ingesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors"
                >
                  <Upload className="h-3 w-3" />
                  Browse XLSX…
                </button>
                {uploadFile && (
                  <>
                    <span className="text-[10px] text-db-label truncate max-w-[160px]" title={uploadFile.name}>
                      {uploadFile.name}
                    </span>
                    <button
                      onClick={handleUpload}
                      disabled={ingesting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium bg-[#0078d4] hover:bg-[#006abc] text-white disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`h-3 w-3 ${ingesting ? 'animate-spin' : ''}`} />
                      {ingesting ? 'Ingesting…' : 'Run Ingest'}
                    </button>
                    <button
                      onClick={() => { setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      disabled={ingesting}
                      className="text-[10px] text-db-muted hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>

              {/* Xray API row */}
              <button
                onClick={() => handleIngest('xray')}
                disabled={ingesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium bg-[#0078d4]/60 hover:bg-[#0078d4] text-white disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${ingesting ? 'animate-spin' : ''}`} />
                {ingesting ? 'Running…' : 'Run Xray API Ingest'}
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingestion History</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {jobs.length === 0 ? (
                <p className="text-[10px] italic text-db-muted">No ingestion jobs run yet.</p>
              ) : (
                <div className="overflow-auto max-h-[260px]">
                  <table className="w-full text-[9px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#1a2d40]">
                        {['Source', 'Status', 'Started', 'Rows', 'Duration', 'Errors'].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-semibold text-db-label whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((j, i) => (
                        <tr key={j.job_id} className={cn('border-b border-db-border/30', i % 2 === 0 ? 'bg-db-row' : 'bg-db-panel')}>
                          <td className="px-2 py-1.5 text-db-label font-medium capitalize">{j.source}</td>
                          <td className={cn('px-2 py-1.5 font-medium capitalize', statusColor(j.status))}>{j.status}</td>
                          <td className="px-2 py-1.5 text-db-muted whitespace-nowrap">{fmtDate(j.started_at)}</td>
                          <td className="px-2 py-1.5 text-db-muted">{j.rows_processed ?? '—'}</td>
                          <td className="px-2 py-1.5 text-db-muted">{j.duration_ms != null ? `${j.duration_ms} ms` : '—'}</td>
                          <td className="px-2 py-1.5 text-fail">{j.errors?.length ? j.errors[0] : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
