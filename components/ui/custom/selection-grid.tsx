'use client'

import { cn } from '@/services/utils'

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
  let gridCols = `md:grid-cols-6`
  if (maxColumns < 6) {
    switch (maxColumns) {
      case 1:
        gridCols = `md:grid-cols-1`
        break
      case 2:
        gridCols = `md:grid-cols-2`
        break
      case 3:
        gridCols = `md:grid-cols-3`
        break
      case 4:
        gridCols = `md:grid-cols-4`
        break
      case 5:
        gridCols = `md:grid-cols-5`
        break
    }
  }

  return (
    <div className={`grid grid-cols-2 gap-3 ${gridCols}`}>
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              'hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus:ring-primary focus:outline-primary flex h-16 min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg border-1 p-3 transition-all hover:scale-105 focus:ring-1 focus:ring-offset-1 focus:outline-none',
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
