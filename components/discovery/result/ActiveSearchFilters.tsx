'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormValues } from '@/types/search-history.types'
import {
  Accessibility,
  Activity,
  Baby,
  Bike,
  Calendar,
  Car,
  Clock,
  Dog,
  Edit3,
  Footprints,
  MapPin,
  Stars,
  Train,
} from 'lucide-react'

interface ActiveSearchFiltersProps {
  searchQuery?: FormValues | null
  onEditFilters?: () => void
  className?: string
}

const getTransportIcon = (transport: string) => {
  switch (transport) {
    case 'foot':
      return <Footprints className="h-4 w-4" />
    case 'bike':
      return <Bike className="h-4 w-4" />
    case 'public_transport':
      return <Train className="h-4 w-4" />
    case 'car':
      return <Car className="h-4 w-4" />
    default:
      return <Car className="h-4 w-4" />
  }
}

const getSpecialCareIcon = (care: string) => {
  switch (care) {
    case 'children':
      return <Baby className="h-4 w-4" />
    case 'lowMobility':
      return <Accessibility className="h-4 w-4" />
    case 'dogs':
      return <Dog className="h-4 w-4" />
    default:
      return null
  }
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
      icon: <Activity className="h-4 w-4" />,
      label: 'Activity',
      value:
        searchQuery.activity === 'other'
          ? searchQuery.otherActivity || 'Custom Activity'
          : searchQuery.activity,
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: 'When',
      value: formatWhen(searchQuery.when),
    },
    {
      icon: <MapPin className="h-4 w-4" />,
      label: 'Distance',
      value: searchQuery.distance,
    },
    {
      icon: getTransportIcon(searchQuery.transportType),
      label: 'Transport',
      value:
        searchQuery.transportType === 'public_transport'
          ? 'Public transport'
          : searchQuery.transportType,
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: 'Duration',
      value: `${searchQuery.activityDurationValue} ${searchQuery.activityDurationUnit}`,
    },
    {
      icon: <Activity className="h-4 w-4" />,
      label: 'Difficulty',
      value: getActivityLevelText(searchQuery.activityLevel),
    },
  ]

  if (searchQuery.specialCare) {
    const specialCareIcon = getSpecialCareIcon(searchQuery.specialCare)
    if (specialCareIcon) {
      allFilters.push({
        icon: specialCareIcon,
        label: 'Special Care',
        value: searchQuery.specialCare,
      })
    }
  }

  return (
    <Card className={`mb-4 ${className}`}>
      <CardContent>
        {/* Search Query Row - Only show if additionalInfo exists */}
        {searchQuery.additionalInfo && (
          <div className="mb-5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Stars className="h-4 w-4 text-muted-foreground" />
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
                <Edit3 className="h-3 w-3" />
                Edit
              </Button>
            )}
          </div>
        )}

        {/* Filters Row - Show filters and edit button on same row when no search query */}
        <div className={`flex ${searchQuery.additionalInfo ? 'flex-wrap gap-2' : 'justify-between items-center'} w-full`}>
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
              className="h-8 gap-1 flex-shrink-0"
            >
              <Edit3 className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
