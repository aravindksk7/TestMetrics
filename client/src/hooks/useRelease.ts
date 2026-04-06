import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  ReleaseDetail, ReleaseBreakdownResponse,
  ReleaseTrendResponse, ReleaseDefectsResponse,
} from '@/types/metrics'

export const useReleaseDetail    = (id: string | undefined) =>
  useQuery({ queryKey: ['release', id, 'summary'],   queryFn: () => api.releases.summary(id!)   as Promise<ReleaseDetail>,               enabled: !!id })

export const useReleaseBreakdown = (id: string | undefined) =>
  useQuery({ queryKey: ['release', id, 'breakdown'], queryFn: () => api.releases.breakdown(id!) as Promise<ReleaseBreakdownResponse>,     enabled: !!id })

export const useReleaseTrend     = (id: string | undefined) =>
  useQuery({ queryKey: ['release', id, 'trend'],     queryFn: () => api.releases.trend(id!)     as Promise<ReleaseTrendResponse>,         enabled: !!id })

export const useReleaseDefects   = (id: string | undefined) =>
  useQuery({ queryKey: ['release', id, 'defects'],   queryFn: () => api.releases.defects(id!)   as Promise<ReleaseDefectsResponse>,       enabled: !!id })
