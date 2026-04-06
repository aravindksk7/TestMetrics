import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  FilterState, DrilldownKpis, FailingTestsResponse,
  DrillFlakyResponse, RecentExecutionsResponse, TypeSummaryResponse,
} from '@/types/metrics'

type F = Partial<FilterState>
const O = { staleTime: 30_000 }

export const useDrilldownKpis  = (f: F) => useQuery({ queryKey: ['drilldown','kpis',f],        queryFn: () => api.drilldown.kpis(f)        as Promise<DrilldownKpis>,          ...O })
export const useTopFailing     = (f: F) => useQuery({ queryKey: ['drilldown','topFailing',f],   queryFn: () => api.drilldown.topFailing(f)  as Promise<FailingTestsResponse>,   ...O })
export const useDrillFlaky     = (f: F) => useQuery({ queryKey: ['drilldown','flaky',f],        queryFn: () => api.drilldown.flakyTests(f)  as Promise<DrillFlakyResponse>,     ...O })
export const useRecentExecs    = (f: F) => useQuery({ queryKey: ['drilldown','recent',f],       queryFn: () => api.drilldown.recent(f)      as Promise<RecentExecutionsResponse>,...O })
export const useTypeSummary    = (f: F) => useQuery({ queryKey: ['drilldown','typeSummary',f],  queryFn: () => api.drilldown.typeSummary(f) as Promise<TypeSummaryResponse>,    ...O })
