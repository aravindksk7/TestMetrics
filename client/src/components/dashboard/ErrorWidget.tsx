import { AlertTriangle } from 'lucide-react'

interface Props { message?: string }

export default function ErrorWidget({ message }: Props) {
  return (
    <div className="flex items-center gap-2 p-3 rounded bg-fail/10 border border-fail/30 text-fail text-[11px]">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{message ?? 'Failed to load data.'}</span>
    </div>
  )
}
