import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  ProgramHealthResponse, AppHealthResponse,
  ProgramTrendResponse, DefectsByProgramResponse,
} from '@/types/metrics'

const OPTS = { staleTime: 60_000 }

export const useProgramHealth    = () => useQuery({ queryKey: ['portfolio','programHealth'],    queryFn: () => api.portfolio.programHealth()    as Promise<ProgramHealthResponse>,    ...OPTS })
export const usePortfolioCoverage = () => useQuery({ queryKey: ['portfolio','coverage'],        queryFn: () => api.portfolio.coverage()         as Promise<{ coverage_pct: number }>, ...OPTS })
export const useProgramTrend     = () => useQuery({ queryKey: ['portfolio','programTrend'],     queryFn: () => api.portfolio.programTrend()     as Promise<ProgramTrendResponse>,     ...OPTS })
export const useAppHealth        = () => useQuery({ queryKey: ['portfolio','appHealth'],        queryFn: () => api.portfolio.appHealth()        as Promise<AppHealthResponse>,        ...OPTS })
export const useDefectsByProgram = () => useQuery({ queryKey: ['portfolio','defectsByProgram'], queryFn: () => api.portfolio.defectsByProgram() as Promise<DefectsByProgramResponse>, ...OPTS })
