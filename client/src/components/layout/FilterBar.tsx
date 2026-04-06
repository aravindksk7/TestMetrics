import { Select } from '@/components/ui/select'
import { useFilters } from '@/hooks/useFilters'
import { useReleases, usePrograms, useApplications, useEnvironments } from '@/hooks/useFilterOptions'
import type { FilterState } from '@/types/metrics'

export default function FilterBar() {
  const { filters, setFilter, resetFilters } = useFilters()

  const { data: relData } = useReleases()
  const { data: progData } = usePrograms()
  const { data: appData  } = useApplications(filters.program_id)
  const { data: envData  } = useEnvironments()

  function handleChange(key: keyof FilterState) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => setFilter(key, e.target.value)
  }

  return (
    <div className="bg-[#1e2d40] px-3.5 py-2 flex items-center gap-3 border-b border-db-border flex-wrap">
      <Select label="Release" value={filters.release_id} onChange={handleChange('release_id')}>
        <option value="">All</option>
        {relData?.releases?.map((r) => (
          <option key={r.release_id} value={r.release_id}>{r.release_name}</option>
        ))}
      </Select>

      <Select label="Program" value={filters.program_id} onChange={handleChange('program_id')}>
        <option value="">All</option>
        {progData?.programs?.map((p) => (
          <option key={p.program_id} value={p.program_id}>{p.program_name}</option>
        ))}
      </Select>

      <Select label="Application" value={filters.app_id} onChange={handleChange('app_id')}>
        <option value="">All</option>
        {appData?.applications?.map((a) => (
          <option key={a.app_id} value={a.app_id}>{a.app_name}</option>
        ))}
      </Select>

      <Select label="Environment" value={filters.env_id} onChange={handleChange('env_id')}>
        <option value="">All</option>
        {envData?.environments?.map((e) => (
          <option key={e.env_id} value={e.env_id}>{e.env_name}</option>
        ))}
      </Select>

      <div className="flex items-center gap-1.5 ml-1">
        <span className="text-[10px] text-db-muted">Date</span>
        <input
          type="date" value={filters.date_from}
          onChange={(e) => setFilter('date_from', e.target.value)}
          className="bg-db-panel border border-db-header/60 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-db-header"
        />
        <span className="text-db-muted text-[10px]">–</span>
        <input
          type="date" value={filters.date_to}
          onChange={(e) => setFilter('date_to', e.target.value)}
          className="bg-db-panel border border-db-header/60 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-db-header"
        />
      </div>

      <button
        onClick={resetFilters}
        className="ml-auto text-[10px] text-db-muted hover:text-white transition-colors"
      >
        Reset
      </button>
    </div>
  )
}
