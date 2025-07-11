'use client'

import { Loader2 } from 'lucide-react'

interface ProgressiveSearchIndicatorProps {
  stage: string
}

export default function ProgressiveSearchIndicator({
  stage,
}: ProgressiveSearchIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Finding {stage} destinations...</span>
    </div>
  )
}
