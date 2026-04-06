import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'pass' | 'fail' | 'blocked'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-db-panel text-db-label border border-db-border',
    pass:    'bg-pass/20 text-pass border border-pass/30',
    fail:    'bg-fail/20 text-fail border border-fail/30',
    blocked: 'bg-blocked/20 text-blocked border border-blocked/30',
  }
  return (
    <div className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold', variants[variant], className)} {...props} />
  )
}

export { Badge }
