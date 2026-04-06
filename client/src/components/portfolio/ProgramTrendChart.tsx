import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProgramTrendResponse } from '@/types/metrics'

interface Props {
  data?:     ProgramTrendResponse
  isLoading: boolean
}

const PROGRAM_COLORS: Record<string, string> = {
  Alpha: '#4ec77a',
  Beta:  '#0078d4',
  Gamma: '#f2a900',
  Delta: '#c77ae0',
}
const FALLBACK_COLORS = ['#4ec77a', '#0078d4', '#f2a900', '#c77ae0', '#e05c5c', '#00c8c8']

function color(name: string, idx: number) {
  return PROGRAM_COLORS[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

export default function ProgramTrendChart({ data, isLoading }: Props) {
  if (isLoading || !data) return <Skeleton className="h-[220px] w-full" />
  if (!data.data.length) return <p className="text-db-muted text-[10px] italic">No trend data.</p>

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data.data} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4a" />
        <XAxis
          dataKey="week"
          tick={{ fill: '#7a8fa8', fontSize: 8 }}
          interval={Math.floor(data.data.length / 6)}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#7a8fa8', fontSize: 8 }}
          tickFormatter={(v) => `${v}%`}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{ background: '#1a2636', border: '1px solid #2a3a4a', borderRadius: 4, fontSize: 10 }}
          labelStyle={{ color: '#9ab' }}
          formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
        />
        <Legend
          iconType="circle"
          iconSize={6}
          wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
        />
        {data.programs.map((prog, i) => (
          <Line
            key={prog}
            type="monotone"
            dataKey={prog}
            stroke={color(prog, i)}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
