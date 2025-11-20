'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/services/utils'

const FullWidthSelect = React.forwardRef<
  React.ComponentRef<typeof SelectTrigger>,
  React.ComponentPropsWithoutRef<typeof Select> & {
    placeholder?: string
    className?: string
    children: React.ReactNode
  }
>(({ className, placeholder, children, ...props }, ref) => (
  <Select {...props}>
    <SelectTrigger ref={ref} className={cn('w-full', className)}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>{children}</SelectContent>
  </Select>
))
FullWidthSelect.displayName = 'FullWidthSelect'

export { FullWidthSelect, SelectItem }
