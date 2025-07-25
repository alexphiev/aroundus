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
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-${maxColumns}`}>
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              'hover:border-primary/50 hover:bg-primary/5 hover:text-primary flex h-16 min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg border-1 p-3 transition-all hover:scale-105',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted-foreground/20 bg-background hover:border-primary/50 hover:bg-primary/5'
            )}
            onClick={() => onChange(isSelected ? undefined : option.value)}
          >
            <div className="mb-1.5 flex-shrink-0">{option.icon}</div>
            <span className="text-center text-sm leading-tight font-medium">
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
