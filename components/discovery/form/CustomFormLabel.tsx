import { FormLabel } from '@/components/ui/form'
import { cn } from '@/services/utils'

export const CustomFormLabel = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <FormLabel className={cn('text-base font-semibold', className)}>
      {children}
    </FormLabel>
  )
}
