'use client'

import { cn } from '@/lib/utils'

// Reusable SelectionGrid component for grid-based selections
interface SelectionGridProps {
  options: Array<{
    value: string
    icon: React.ReactNode
    label: string
  }>
  value?: string
  onChange: (value?: string) => void
  maxColumns?: number
}

export function SelectionGrid({
  options,
  value,
  onChange,
  maxColumns = 6,
}: SelectionGridProps) {
  // Calculate grid layout based on number of options with max 6 per row
  const maxCols = Math.min(maxColumns, options.length)

  return (
    <div
      className={cn(
        'grid gap-3',
        `grid-cols-${maxCols}`,
        options.length <= 3 && 'max-w-md'
      )}
    >
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all h-16 min-w-0 cursor-pointer',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted-foreground/20 bg-background hover:border-primary/50 hover:bg-primary/5'
            )}
            onClick={() => onChange(isSelected ? undefined : option.value)}
          >
            <div className="mb-1.5 flex-shrink-0">{option.icon}</div>
            <span className="text-xs font-medium text-center leading-tight">
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
