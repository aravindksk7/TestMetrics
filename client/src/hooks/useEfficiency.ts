import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EfficiencyKpis, ThroughputResponse, AutomationSplitResponse, FlakyTestsResponse } from '@/types/metrics'

const O = { staleTime: 60_000 }
export const useEfficiencyKpis    = () => useQuery({ queryKey: ['efficiency','kpis'],            queryFn: () => api.efficiency.kpis()            as Promise<EfficiencyKpis>,         ...O })
export const useThroughput        = () => useQuery({ queryKey: ['efficiency','throughput'],        queryFn: () => api.efficiency.throughput()        as Promise<ThroughputResponse>,     ...O })
export const useAutomationSplit   = () => useQuery({ queryKey: ['efficiency','automationSplit'],   queryFn: () => api.efficiency.automationSplit()   as Promise<AutomationSplitResponse>,...O })
export const useEfficiencyFlaky   = () => useQuery({ queryKey: ['efficiency','flakyTests'],        queryFn: () => api.efficiency.flakyTests()        as Promise<FlakyTestsResponse>,     ...O })
