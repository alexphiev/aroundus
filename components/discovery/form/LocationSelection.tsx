'use client'

import { Button } from '@/components/ui/button'
import { SelectionGrid } from '@/components/ui/custom/selection-grid'
import { FormControl, FormItem, FormMessage } from '@/components/ui/form'
import { type LocationSuggestion } from '@/lib/location-autocomplete.service'
import { cn } from '@/lib/utils'
import { MapPin, Navigation } from 'lucide-react'
import { useState } from 'react'
import { CustomFormLabel } from './CustomFormLabel'
import { LocationAutocomplete } from './LocationAutocomplete'

interface LocationSelectionProps {
  locationType: 'current' | 'custom'
  onLocationTypeChange: (type: 'current' | 'custom') => void
  customLocation?: LocationSuggestion | null
  onCustomLocationChange: (location: LocationSuggestion | null) => void
  userLocation: { latitude: number; longitude: number } | null
  locationError: string | null
  onRetryLocation: () => void
  disabled?: boolean
  className?: string
}

export function LocationSelection({
  locationType,
  onLocationTypeChange,
  customLocation,
  onCustomLocationChange,
  userLocation,
  locationError,
  onRetryLocation,
  disabled = false,
  className,
}: LocationSelectionProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true)
    try {
      await onRetryLocation()
    } finally {
      setIsGettingLocation(false)
    }
  }

  // Location options for the grid
  const locationOptions = [
    {
      value: 'current',
      icon: <Navigation className="h-5 w-5" />,
      label: 'Current Location',
    },
    {
      value: 'custom',
      icon: <MapPin className="h-5 w-5" />,
      label: 'Custom Location',
    },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      <FormItem>
        <CustomFormLabel>Where would you like to search?</CustomFormLabel>
        <SelectionGrid
          options={locationOptions}
          value={locationType}
          onChange={(value) =>
            onLocationTypeChange(value as 'current' | 'custom')
          }
          maxColumns={2}
        />
        <FormMessage />
      </FormItem>

      {/* Current Location Status */}
      {locationType === 'current' && (
        <div className="flex items-center justify-between">
          {locationError ? (
            <div className="flex items-center gap-3">
              <span className="text-destructive text-sm">{locationError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetCurrentLocation}
                disabled={isGettingLocation || disabled}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                {isGettingLocation ? 'Getting...' : 'Retry'}
              </Button>
            </div>
          ) : (
            !userLocation && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetCurrentLocation}
                disabled={isGettingLocation || disabled}
              >
                {isGettingLocation ? 'Getting...' : 'Get Location'}
              </Button>
            )
          )}
        </div>
      )}

      {/* Custom Location Input - Shows when custom is selected */}
      {locationType === 'custom' && (
        <FormItem>
          <CustomFormLabel>Search for a location</CustomFormLabel>
          <FormControl>
            <LocationAutocomplete
              value={customLocation}
              onChange={onCustomLocationChange}
              placeholder="Search for a city, region, or landmark..."
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    </div>
  )
}
