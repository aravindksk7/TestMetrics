import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { DefectsByProgramResponse } from '@/types/metrics'

interface Props {
  data?:     DefectsByProgramResponse
  isLoading: boolean
}

export default function DefectsByProgramChart({ data, isLoading }: Props) {
  if (isLoading || !data) return <Skeleton className="h-[220px] w-full" />

  const chartData = data.programs.map((prog, i) => ({
    program:  prog,
    Critical: data.series.critical[i],
    High:     data.series.high[i],
    Medium:   data.series.medium[i],
    Low:      data.series.low[i],
  }))

  const hasData = chartData.some((d) => d.Critical + d.High + d.Medium + d.Low > 0)
  if (!hasData) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <p className="text-pass text-[11px]">No open defects across portfolio</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" vertical={false} />
        <XAxis
          dataKey="program"
          tick={{ fill: '#7a8fa8', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: '#7a8fa8', fontSize: 8 }}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={24}
        />
        <Tooltip
          contentStyle={{ background: '#1a2636', border: '1px solid #2a3a4a', borderRadius: 4, fontSize: 10 }}
          labelStyle={{ color: '#9ab' }}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
        <Bar dataKey="Critical" stackId="a" fill="#e05c5c" radius={[0,0,0,0]} />
        <Bar dataKey="High"     stackId="a" fill="#c07010" />
        <Bar dataKey="Medium"   stackId="a" fill="#0078d4" />
        <Bar dataKey="Low"      stackId="a" fill="#3a5060" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
