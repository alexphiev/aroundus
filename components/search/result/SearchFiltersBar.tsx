'use client'

import { Button } from '@/components/ui/button'
import { SearchFilters } from '@/types/search.types'
import { MapPin, Clock, Bike, Train, Car, Footprints, Activity, X } from 'lucide-react'

interface SearchFiltersBarProps {
  filters: SearchFilters
  onEdit: () => void
  onClear: () => void
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
      return <Train className="h-4 w-4" />
  }
}

const getTransportLabel = (transport: string) => {
  switch (transport) {
    case 'foot':
      return 'On foot'
    case 'bike':
      return 'By bike'
    case 'public_transport':
      return 'By public transport'
    case 'car':
      return 'By car'
    default:
      return transport
  }
}

const getActivityLabel = (activity: string) => {
  return activity.charAt(0).toUpperCase() + activity.slice(1)
}

export default function SearchFiltersBar({ filters, onEdit, onClear }: SearchFiltersBarProps) {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {filters.locationName && (
            <div className="bg-muted flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5" />
              <span>{filters.locationName}</span>
            </div>
          )}

          <div className="bg-muted flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
            <Clock className="h-3.5 w-3.5" />
            <span>{filters.distance}</span>
          </div>

          <div className="bg-muted flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
            {getTransportIcon(filters.transportType)}
            <span>{getTransportLabel(filters.transportType)}</span>
          </div>

          {filters.activity && (
            <div className="bg-muted flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
              <Activity className="h-3.5 w-3.5" />
              <span>{getActivityLabel(filters.activity)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
          >
            Edit Filters
          </Button>
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
