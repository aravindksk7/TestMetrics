import { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { FilterState } from '@/types/metrics'

const DEFAULT_FILTERS: FilterState = {
  release_id: '', program_id: '', app_id: '',
  env_id: '', date_from: '2024-01-01', date_to: '2026-04-30',
}

type Action = { type: 'SET'; key: keyof FilterState; value: string }
            | { type: 'RESET' }

function reducer(state: FilterState, action: Action): FilterState {
  if (action.type === 'RESET') return DEFAULT_FILTERS
  const next = { ...state, [action.key]: action.value }
  if (action.key === 'program_id') next.app_id = ''
  return next
}

function readFromUrl(): Partial<FilterState> {
  const params = new URLSearchParams(window.location.search)
  const result: Partial<FilterState> = {}
  for (const key of Object.keys(DEFAULT_FILTERS) as (keyof FilterState)[]) {
    const v = params.get(key)
    if (v) result[key] = v
  }
  return result
}

function writeToUrl(filters: FilterState) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v && v !== DEFAULT_FILTERS[k as keyof FilterState]) params.set(k, v)
  }
  const search = params.toString()
  window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname)
}

interface FilterContextValue {
  filters:       FilterState
  activeFilters: Partial<FilterState>
  setFilter:     (key: keyof FilterState, value: string) => void
  resetFilters:  () => void
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, dispatch] = useReducer(reducer, {
    ...DEFAULT_FILTERS,
    ...readFromUrl(),
  })

  useEffect(() => { writeToUrl(filters) }, [filters])

  const setFilter = useCallback((key: keyof FilterState, value: string) => {
    dispatch({ type: 'SET', key, value })
  }, [])

  const resetFilters = useCallback(() => dispatch({ type: 'RESET' }), [])

  const activeFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Partial<FilterState>,
    [filters]
  )

  const value = useMemo(
    () => ({ filters, activeFilters, setFilter, resetFilters }),
    [filters, activeFilters, setFilter, resetFilters]
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilters() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used inside <FilterProvider>')
  return ctx
}
