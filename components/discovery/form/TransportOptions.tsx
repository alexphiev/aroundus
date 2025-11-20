import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/services/utils'

interface TransportOptionProps {
  value: string
  current: string
  onChange: (value: string) => void
  icon: React.ReactNode
  label: string
}

export function TransportOption({
  value,
  current,
  onChange,
  icon,
  label,
}: TransportOptionProps) {
  const isSelected = current === value

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'p-2 rounded-full transition-all cursor-pointer hover:scale-105',
            isSelected
              ? 'bg-primary/10 text-primary ring-2 ring-primary'
              : 'bg-muted text-muted-foreground hover:bg-primary/5 hover:text-primary/80'
          )}
          onClick={() => onChange(value)}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
