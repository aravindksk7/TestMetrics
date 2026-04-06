import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  FilterState, KpisResponse, TrendResponse,
  OutcomesResponse, HeatmapResponse, ReleaseSummaryResponse,
  DefectTrendResponse,
} from '@/types/metrics'

type F = Partial<FilterState>

export const useKpis              = (f: F) => useQuery({ queryKey: ['metrics','kpis',f],              queryFn: () => api.metrics.kpis(f)              as Promise<KpisResponse>             })
export const usePassRateTrend     = (f: F) => useQuery({ queryKey: ['metrics','trend',f],             queryFn: () => api.metrics.passRateTrend(f)     as Promise<TrendResponse>            })
export const useOutcomesByRelease = (f: F) => useQuery({ queryKey: ['metrics','outcomes',f],          queryFn: () => api.metrics.outcomesByRelease(f) as Promise<OutcomesResponse>         })
export const useHeatmap           = (f: F) => useQuery({ queryKey: ['metrics','heatmap',f],           queryFn: () => api.metrics.heatmap(f)           as Promise<HeatmapResponse>          })
export const useReleaseSummary    = (f: F) => useQuery({ queryKey: ['metrics','releaseSummary',f],    queryFn: () => api.metrics.releaseSummary(f)    as Promise<ReleaseSummaryResponse>   })
export const useDefectTrend       = (f: F) => useQuery({ queryKey: ['metrics','defectTrend',f],       queryFn: () => api.metrics.defectTrend(f)       as Promise<DefectTrendResponse>      })
