'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormValues } from '@/types/search-history.types'
import { getIcon, IconType } from '@/utils/icon.utils'
import { Activity, Calendar, Clock, Edit, MapPin, PawPrint } from 'lucide-react'

interface ActiveSearchFiltersProps {
  searchQuery?: FormValues | null
  onEditFilters?: () => void
  className?: string
}

const formatWhen = (when: string) => {
  switch (when) {
    case 'today':
      return 'Today'
    case 'tomorrow':
      return 'Tomorrow'
    case 'this_weekend':
      return 'This Weekend'
    default:
      try {
        const date = new Date(when)
        return date.toLocaleDateString()
      } catch {
        return when
      }
  }
}

const getActivityLevelText = (level: number) => {
  switch (level) {
    case 1:
      return 'Very Easy'
    case 2:
      return 'Easy'
    case 3:
      return 'Moderate'
    case 4:
      return 'Hard'
    case 5:
      return 'Very Hard'
    default:
      return `Level ${level}`
  }
}

export default function ActiveSearchFilters({
  searchQuery,
  onEditFilters,
  className = '',
}: ActiveSearchFiltersProps) {
  if (!searchQuery) return null

  const allFilters = [
    {
      icon: <MapPin className="h-4 w-4" />,
      label: 'Location',
      value:
        searchQuery.locationName ||
        searchQuery.customLocation?.name ||
        'Location',
    },
    {
      icon: <Activity className="h-4 w-4" />,
      label: 'Activity',
      value:
        searchQuery.activity === 'other'
          ? searchQuery.otherActivity || 'Custom Activity'
          : searchQuery.activity,
    },
    {
      icon: <MapPin className="h-4 w-4" />,
      label: 'Distance',
      value: searchQuery.distance,
    },
    {
      icon: getIcon(IconType.TRANSPORT, searchQuery.transportType, 4),
      label: 'Transport',
      value:
        searchQuery.transportType === 'public_transport'
          ? 'Public transport'
          : searchQuery.transportType,
    },
  ]

  if (searchQuery.when) {
    allFilters.push({
      icon: <Calendar className="h-4 w-4" />,
      label: 'When',
      value: formatWhen(searchQuery.when),
    })
  }

  if (searchQuery.activityLevel) {
    allFilters.push({
      icon: <Activity className="h-4 w-4" />,
      label: 'Difficulty',
      value: getActivityLevelText(searchQuery.activityLevel),
    })
  }

  if (searchQuery.activityDurationValue && searchQuery.activityDurationUnit) {
    allFilters.push({
      icon: <Clock className="h-4 w-4" />,
      label: 'Duration',
      value: `${searchQuery.activityDurationValue} ${searchQuery.activityDurationUnit}`,
    })
  }

  if (searchQuery.specialCare) {
    const specialCareIcon = getIcon(
      IconType.SPECIAL_CARE,
      searchQuery.specialCare,
      5
    )
    if (specialCareIcon) {
      allFilters.push({
        icon: specialCareIcon,
        label: 'Special Care',
        value: searchQuery.specialCare,
      })
    }
  }

  return (
    <Card className={`py-0 ${className}`}>
      <CardContent className="px-4 py-3">
        {/* Search Query Row - Only show if additionalInfo exists */}
        {searchQuery.additionalInfo && (
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PawPrint className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground">
                {searchQuery.additionalInfo}
              </span>
            </div>
            {onEditFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditFilters}
                className="h-8 gap-1"
              >
                <Edit className="h-3 w-3" />
                Edit
              </Button>
            )}
          </div>
        )}

        {/* Filters Row - Show filters and edit button on same row when no search query */}
        <div
          className={`flex ${searchQuery.additionalInfo ? 'flex-wrap gap-2' : 'items-center justify-between'} w-full`}
        >
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {allFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="gap-1.5 py-1">
                {filter.icon}
                <span className="text-xs">
                  {filter.label}: {filter.value}
                </span>
              </Badge>
            ))}
          </div>

          {/* Edit button - show on same row when no search query */}
          {!searchQuery.additionalInfo && onEditFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditFilters}
              className="h-8 flex-shrink-0 gap-1"
            >
              <Edit className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
