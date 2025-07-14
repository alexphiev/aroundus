'use client'

import { Loader2 } from 'lucide-react'

interface ProgressiveSearchIndicatorProps {
  stage: string
}

export default function ProgressiveSearchIndicator({
  stage,
}: ProgressiveSearchIndicatorProps) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 className="text-primary h-4 w-4 animate-spin" />
      <span>Finding {stage} destinations...</span>
    </div>
  )
}
