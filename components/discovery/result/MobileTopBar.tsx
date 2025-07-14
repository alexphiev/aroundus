'use client'

import { FormValues } from '@/types/search-history.types'
import { capitalize } from '@/utils/general.utils'
import { Edit3, Plus } from 'lucide-react'
import { useMemo } from 'react'

interface Props {
  searchQuery?: FormValues | null
  generatedTitle?: string | null
  onEditFilters?: () => void
  onNewSearch?: () => void
}

export default function MobileTopBar({
  searchQuery,
  generatedTitle,
  onEditFilters,
  onNewSearch,
}: Props) {
  // Generate primary filter summary (second line)
  const filterSummary = useMemo(() => {
    if (!searchQuery) return null

    const parts: string[] = []

    // Activity
    if (searchQuery.activity) {
      const activity =
        searchQuery.activity === 'other'
          ? searchQuery.otherActivity
          : searchQuery.activity
      if (activity) parts.push(capitalize(activity))
    }

    // When
    if (searchQuery.when && searchQuery.when !== 'today') {
      const when =
        searchQuery.when === 'custom' && searchQuery.customDate
          ? searchQuery.customDate.toLocaleDateString()
          : searchQuery.when.replace('_', ' ')
      parts.push(capitalize(when))
    }

    // Transport
    if (searchQuery.transportType && searchQuery.distance) {
      const transportLabels = {
        foot: 'walking',
        bike: 'by bike',
        public_transport: 'by public transport',
        car: 'by car',
      }
      parts.push(
        'Around ' +
          searchQuery.distance +
          ' ' +
          transportLabels[searchQuery.transportType]
      )
    }

    // Activity level
    if (searchQuery.activityLevel && searchQuery.activityDurationValue) {
      const levelLabels = {
        1: 'Easy',
        2: 'Moderate',
        3: 'Challenging',
        4: 'Difficult',
        5: 'Extreme',
      }
      parts.push(
        `${levelLabels[searchQuery.activityLevel as keyof typeof levelLabels]} level for ${searchQuery.activityDurationValue}${searchQuery.activityDurationUnit === 'hours' ? 'h' : 'days'}`
      )
    }

    // Special care
    if (searchQuery.specialCare) {
      const careLabels = {
        children: 'Child-friendly',
        lowMobility: 'Accessible',
        dogs: 'Dog-friendly',
        other: searchQuery.otherSpecialCare || 'Special care',
      }
      parts.push(careLabels[searchQuery.specialCare])
    }

    // Location
    if (searchQuery.locationName) {
      parts.push(`Near ${searchQuery.locationName}`)
    }

    return parts.length > 0 ? parts.join(' • ') : null
  }, [searchQuery])

  return (
    <div className="bg-background/95 border-border/10 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-sm">
      <div className="flex items-center gap-3 px-1 py-1">
        {/* Central Filter Summary Button */}
        <button
          onClick={onEditFilters}
          className="border-border flex-1 rounded-lg border bg-white px-4 py-4 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 text-left">
              <div className="text-sm leading-tight font-medium">
                {generatedTitle}
              </div>

              {filterSummary && (
                <div className="text-muted-foreground mt-1 text-xs leading-tight">
                  {filterSummary}
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-full p-1.5">
              <Edit3 className="h-3 w-3" />
            </div>
          </div>
        </button>

        <button
          onClick={onNewSearch}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full p-3 shadow-sm transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
