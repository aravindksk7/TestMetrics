import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, children, ...props }, ref) => (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[10px] text-db-muted shrink-0">{label}</span>}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'appearance-none bg-db-panel border border-db-header/60 rounded px-2.5 pr-6 py-1',
            'text-[11px] text-white font-medium focus:outline-none focus:ring-1 focus:ring-db-header',
            'cursor-pointer',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-db-label" />
      </div>
    </div>
  )
)
Select.displayName = 'Select'

export { Select }
