'use client'

import { FormValues } from '@/types/search-history.types'
import { ArrowLeft, Edit3 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  searchQuery?: FormValues | null
  generatedTitle?: string | null
  resultsCount: number
  onEditFilters?: () => void
}

export default function MobileTopBar({
  searchQuery,
  generatedTitle,
  resultsCount,
  onEditFilters,
}: Props) {
  const router = useRouter()

  // Generate filter summary for the main button
  const getFilterSummary = () => {
    if (!searchQuery) return 'Nature Discovery'

    const parts = []
    
    // Activity
    if (searchQuery.activity) {
      const activity = searchQuery.activity === 'other' 
        ? searchQuery.otherActivity 
        : searchQuery.activity
      if (activity) parts.push(activity)
    }

    // Distance
    if (searchQuery.distance) {
      parts.push(searchQuery.distance)
    }

    // When
    if (searchQuery.when && searchQuery.when !== 'today') {
      const when = searchQuery.when === 'custom' && searchQuery.customDate
        ? searchQuery.customDate.toLocaleDateString()
        : searchQuery.when.replace('_', ' ')
      parts.push(when)
    }

    return parts.length > 0 ? parts.join(' • ') : 'Nature Discovery'
  }

  // Generate secondary filter line
  const getSecondaryFilters = () => {
    if (!searchQuery) return `${resultsCount} places found`

    const parts = []

    // Activity level
    if (searchQuery.activityLevel) {
      const levels = ['Low', 'Light', 'Moderate', 'High', 'Intense']
      parts.push(`${levels[searchQuery.activityLevel - 1]} intensity`)
    }

    // Transport type
    if (searchQuery.transportType) {
      const transport = searchQuery.transportType === 'public_transport' 
        ? 'Public transport' 
        : searchQuery.transportType.replace('_', ' ')
      parts.push(transport)
    }

    // Add results count
    parts.push(`${resultsCount} places`)

    return parts.join(' • ')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/10">
      <div className="flex items-center px-4 py-3 gap-3">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Central Filter Summary Button */}
        <button
          onClick={onEditFilters}
          className="flex-1 bg-white border border-border rounded-full px-4 py-3 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 text-left">
              {/* Primary title line */}
              <div className="font-medium text-sm leading-tight">
                {generatedTitle || getFilterSummary()}
              </div>
              
              {/* Secondary filters line */}
              <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                {getSecondaryFilters()}
              </div>
            </div>

            {/* Edit Icon */}
            <div className="ml-2 p-1.5 bg-muted/50 rounded-full">
              <Edit3 className="h-3 w-3" />
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}