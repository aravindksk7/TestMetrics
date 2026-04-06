import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Release, Program, Application, Environment, DateRange } from '@/types/metrics'

export const useReleases     = () => useQuery({ queryKey: ['filters','releases'],    queryFn: () => api.filters.releases()    as Promise<{ releases: Release[] }>,     staleTime: Infinity })
export const usePrograms     = () => useQuery({ queryKey: ['filters','programs'],    queryFn: () => api.filters.programs()    as Promise<{ programs: Program[] }>,     staleTime: Infinity })
export const useEnvironments = () => useQuery({ queryKey: ['filters','envs'],        queryFn: () => api.filters.environments()as Promise<{ environments: Environment[] }>, staleTime: Infinity })
export const useDateRange    = () => useQuery({ queryKey: ['filters','dateRange'],   queryFn: () => api.filters.dateRange()   as Promise<DateRange>,                   staleTime: Infinity })

export const useApplications = (programId: string) =>
  useQuery({
    queryKey: ['filters', 'applications', programId],
    queryFn:  () => api.filters.applications(programId || undefined) as Promise<{ applications: Application[] }>,
    staleTime: Infinity,
  })
