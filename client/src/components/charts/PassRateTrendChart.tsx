import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { TrendResponse } from '@/types/metrics'

interface Props {
  data?:      TrendResponse
  isLoading:  boolean
}

export default function PassRateTrendChart({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return <Skeleton className="h-[150px] w-full" />
  }

  const chartData = data.labels.map((week, i) => ({ week, pass_rate: data.values[i] }))
  const lastIndex = chartData.length - 1

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00b4d8" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#00b4d8" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#2c3e50" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: '#8ab4d4', fontSize: 8 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          domain={[40, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: '#8ab4d4', fontSize: 8 }}
          axisLine={false} tickLine={false}
          width={34}
        />
        <Tooltip
          contentStyle={{ background: '#243447', border: '1px solid #0f3d6e', borderRadius: 4, fontSize: 11 }}
          labelStyle={{ color: '#a8d4f5' }}
          formatter={(v: number) => [`${v}%`, 'Pass Rate']}
        />
        <Area
          type="monotone"
          dataKey="pass_rate"
          stroke="#00b4d8"
          strokeWidth={2.5}
          fill="url(#trendGrad)"
          dot={(props) => {
            const isLast = props.index === lastIndex
            return (
              <Dot
                key={props.key}
                {...props}
                r={isLast ? 4 : 3}
                fill={isLast ? '#f2a900' : '#00b4d8'}
                stroke="none"
              />
            )
          }}
          activeDot={{ r: 5, fill: '#00b4d8', stroke: '#1a2535', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
