import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { OutcomesResponse } from '@/types/metrics'

interface Props {
  data?:     OutcomesResponse
  isLoading: boolean
}

export default function OutcomesByReleaseChart({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return <Skeleton className="h-[150px] w-full" />
  }

  const chartData = data.releases.map((release, i) => ({
    release,
    Passed:  data.series.passed[i]  ?? 0,
    Failed:  data.series.failed[i]  ?? 0,
    Blocked: data.series.blocked[i] ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid stroke="#2c3e50" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="release"
          tick={{ fill: '#8ab4d4', fontSize: 8 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: '#8ab4d4', fontSize: 8 }}
          axisLine={false} tickLine={false}
          width={34}
        />
        <Tooltip
          contentStyle={{ background: '#243447', border: '1px solid #0f3d6e', borderRadius: 4, fontSize: 11 }}
          formatter={(v: number, name: string) => [`${v}%`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 9, color: '#8ab4d4', paddingTop: 4 }}
          iconSize={8}
        />
        <Bar dataKey="Passed"  stackId="a" fill="#4ec77a" />
        <Bar dataKey="Failed"  stackId="a" fill="#e05c5c" />
        <Bar dataKey="Blocked" stackId="a" fill="#f0a030" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
