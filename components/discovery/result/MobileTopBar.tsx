'use client'

import { Button } from '@/components/ui/button'
import { FormValues } from '@/types/search-history.types'
import { capitalize } from '@/utils/general.utils'
import { Edit3, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

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
  const [isExpanded, setIsExpanded] = useState(false)

  // Generate individual filter chips
  const filterChips = useMemo(() => {
    if (!searchQuery) return []

    const chips: string[] = []

    // Location
    if (searchQuery.locationName) {
      chips.push(`Near ${searchQuery.locationName}`)
    }

    // Activity
    if (searchQuery.activity) {
      const activity =
        searchQuery.activity === 'other'
          ? searchQuery.otherActivity
          : searchQuery.activity
      if (activity) chips.push(capitalize(activity))
    }

    // When
    if (searchQuery.when && searchQuery.when !== 'today') {
      const when =
        searchQuery.when === 'custom' && searchQuery.customDate
          ? searchQuery.customDate.toLocaleDateString()
          : searchQuery.when.replace('_', ' ')
      chips.push(capitalize(when))
    }

    // Transport
    if (searchQuery.transportType && searchQuery.distance) {
      const transportLabels = {
        foot: 'walking',
        bike: 'by bike',
        public_transport: 'by public transport',
        car: 'by car',
      }
      chips.push(
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
      chips.push(
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
      chips.push(careLabels[searchQuery.specialCare])
    }

    return chips
  }, [searchQuery])

  // Determine how many chips to show in collapsed view
  const maxVisibleChips = 2
  const visibleChips = isExpanded
    ? filterChips
    : filterChips.slice(0, maxVisibleChips)
  const hiddenCount = filterChips.length - maxVisibleChips

  return (
    <div className="bg-background/95 border-border/10 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-sm">
      <div className="flex flex-col items-start justify-between gap-2 p-4 py-2">
        <div className="flex w-full items-center justify-between">
          <div className="text-base leading-tight font-medium">
            {generatedTitle}
          </div>

          <div className="flex items-center">
            {/* Edit button */}
            <Button
              onClick={onEditFilters}
              variant="outline"
              size="sm"
              className="flex-shrink-0 rounded-l-lg rounded-r-none p-2 text-xs"
            >
              <Edit3 className="text-muted-foreground h-3 w-3" />
              Edit
            </Button>
            <Button
              onClick={onNewSearch}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-l-none rounded-r-lg p-3 text-sm text-xs shadow-sm transition-colors"
            >
              <Plus className="h-3 w-3" />
              New
            </Button>
          </div>
        </div>

        <div className="flex w-full items-center gap-2">
          {/* Filter chips */}
          {filterChips.length > 0 && (
            <div className="flex flex-1 flex-wrap items-center gap-1">
              {visibleChips.map((chip, index) => (
                <span
                  key={index}
                  className="text-muted-foreground rounded-full bg-white px-2 py-1 text-xs"
                >
                  {chip}
                </span>
              ))}
              {!isExpanded && hiddenCount > 0 && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="bg-muted/50 text-muted-foreground hover:bg-muted/70 rounded-full px-2 py-1 text-xs transition-colors"
                >
                  +{hiddenCount}
                </button>
              )}
              {isExpanded && filterChips.length > maxVisibleChips && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="bg-muted/50 text-muted-foreground hover:bg-muted/70 rounded-full px-2 py-1 text-xs transition-colors"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
