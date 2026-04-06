import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  TraceabilityKpis, CoverageByReleaseResponse, CoverageByPriorityResponse,
  UncoveredRequirementsResponse, ReqPerformanceResponse,
} from '@/types/metrics'

const O = { staleTime: 60_000 }
export const useTraceabilityKpis       = () => useQuery({ queryKey: ['traceability','kpis'],              queryFn: () => api.traceability.kpis()              as Promise<TraceabilityKpis>,             ...O })
export const useCoverageByRelease      = () => useQuery({ queryKey: ['traceability','coverageByRelease'], queryFn: () => api.traceability.coverageByRelease() as Promise<CoverageByReleaseResponse>,    ...O })
export const useCoverageByPriority     = () => useQuery({ queryKey: ['traceability','coverageByPriority'],queryFn: () => api.traceability.coverageByPriority()as Promise<CoverageByPriorityResponse>,   ...O })
export const useUncoveredRequirements  = () => useQuery({ queryKey: ['traceability','uncovered'],         queryFn: () => api.traceability.uncovered()         as Promise<UncoveredRequirementsResponse>,...O })
export const useReqPerformance         = () => useQuery({ queryKey: ['traceability','reqPerf'],           queryFn: () => api.traceability.reqPerformance()    as Promise<ReqPerformanceResponse>,       ...O })
