'use client'

import { ArrowLeft } from 'lucide-react'

interface Props {
  onBack: () => void
  placeName?: string
}

export default function DetailViewTopBar({ onBack, placeName }: Props) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/10">
      <div className="flex items-center px-4 py-3 gap-3">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Place Name */}
        {placeName && (
          <div className="flex-1">
            <h1 className="font-medium text-base line-clamp-1">{placeName}</h1>
          </div>
        )}
      </div>
    </div>
  )
}