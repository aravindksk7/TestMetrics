import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { DefectTrendResponse } from '@/types/metrics'

interface Props {
  data?:     DefectTrendResponse
  isLoading: boolean
}

export default function DefectTrendChart({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return <Skeleton className="h-[145px] w-full" />
  }

  const chartData = data.labels.map((label, i) => ({
    label,
    critical: data.open_critical[i] ?? 0,
    high:     data.open_high[i]     ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={145}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid stroke="#2c3e50" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#8ab4d4', fontSize: 8 }}
          axisLine={false} tickLine={false}
          interval={2}
        />
        <YAxis
          tick={{ fill: '#8ab4d4', fontSize: 8 }}
          axisLine={false} tickLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ background: '#243447', border: '1px solid #0f3d6e', borderRadius: 4, fontSize: 11 }}
          labelStyle={{ color: '#a8d4f5' }}
          formatter={(v: number, name: string) => [v, name === 'critical' ? 'Open Critical' : 'Open High']}
        />
        <Legend
          wrapperStyle={{ fontSize: 9, color: '#8ab4d4', paddingTop: 4 }}
          iconSize={8}
          formatter={(v) => v === 'critical' ? 'Open Critical' : 'Open High'}
        />
        <Area
          type="stepAfter"
          dataKey="high"
          stroke="#f0a030"
          fill="#f0a030"
          fillOpacity={0.15}
          strokeWidth={1.5}
          dot={false}
        />
        <Line
          type="stepAfter"
          dataKey="critical"
          stroke="#e05c5c"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: '#e05c5c', stroke: '#1a2535', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
