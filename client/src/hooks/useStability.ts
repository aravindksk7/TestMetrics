import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StabilityKpis, EnvSummaryResponse, EnvBlockedTrendResponse, ProgramEnvStabilityResponse } from '@/types/metrics'

const O = { staleTime: 60_000 }
export const useStabilityKpis   = () => useQuery({ queryKey: ['stability','kpis'],         queryFn: () => api.stability.kpis()         as Promise<StabilityKpis>,                ...O })
export const useEnvSummary      = () => useQuery({ queryKey: ['stability','summary'],       queryFn: () => api.stability.summary()      as Promise<EnvSummaryResponse>,           ...O })
export const useEnvBlockedTrend = () => useQuery({ queryKey: ['stability','blockedTrend'],  queryFn: () => api.stability.blockedTrend() as Promise<EnvBlockedTrendResponse>,      ...O })
export const useProgramEnv      = () => useQuery({ queryKey: ['stability','programEnv'],    queryFn: () => api.stability.programEnv()   as Promise<ProgramEnvStabilityResponse>,  ...O })
