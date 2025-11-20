'use client'

import { Button } from '@/components/ui/button'
import { SelectionGrid } from '@/components/ui/custom/selection-grid'
import {
  FormControl,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { type LocationSuggestion } from '@/services/location-autocomplete.service'
import {
  CheckCircle,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { CustomFormLabel } from './CustomFormLabel'
import { LocationAutocomplete } from './LocationAutocomplete'

interface LocationSelectionProps {
  locationType: 'current' | 'custom'
  onLocationTypeChange: (type: 'current' | 'custom') => void
  customLocation?: LocationSuggestion | null
  onCustomLocationChange: (location: LocationSuggestion | null) => void
  userLocation: { latitude: number; longitude: number } | null
  userLocationInfo?: {
    locationName: string
    city?: string
    region?: string
    country?: string
  } | null
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
  userLocationInfo,
  locationError,
  onRetryLocation,
  disabled = false,
  className,
}: LocationSelectionProps) {
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)

  const handleGetCurrentLocation = useCallback(() => {
    setIsRequestingLocation(true)
    onRetryLocation()
  }, [onRetryLocation])

  // Auto-trigger location request when current location is selected and no location exists
  useEffect(() => {
    if (
      locationType === 'current' &&
      !userLocation &&
      !locationError &&
      !isRequestingLocation
    ) {
      handleGetCurrentLocation()
    }
  }, [
    locationType,
    userLocation,
    locationError,
    isRequestingLocation,
    handleGetCurrentLocation,
  ])

  // Reset loading state when location is obtained or failed
  useEffect(() => {
    if (userLocationInfo || locationError) {
      setIsRequestingLocation(false)
    }
  }, [userLocationInfo, locationError])

  // Location options for the grid
  const locationOptions = [
    {
      value: 'custom',
      icon: <MapPin className="h-5 w-5" />,
      label: 'Custom Location',
    },
    {
      value: 'current',
      icon: <Navigation className="h-5 w-5" />,
      label: 'Current Location',
    },
  ]

  return (
    <div className={className}>
      <FormItem>
        <CustomFormLabel>
          Where would you like to search?
        </CustomFormLabel>
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {locationError && (
              <div className="flex items-center gap-3">
                <span className="text-destructive text-sm">
                  {locationError}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                  disabled={isRequestingLocation || disabled}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  {isRequestingLocation ? 'Getting...' : 'Retry'}
                </Button>
              </div>
            )}
          </div>

          {/* Only show geocoding state if we're actually requesting location but got coordinates without address */}
          {isRequestingLocation &&
            userLocation &&
            !userLocationInfo &&
            !locationError && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Finding your address...
                </p>
              </div>
            )}

          {/* Current Location Display - show when we have location and not currently requesting */}
          {userLocation && !isRequestingLocation && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div className="min-w-0">
                <p className="truncate text-sm text-green-600 dark:text-green-400">
                  {userLocationInfo?.locationName ||
                    `Location found (${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)})`}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGetCurrentLocation}
                disabled={isRequestingLocation || disabled}
                className="h-8 w-8 flex-shrink-0 p-0 text-green-600 hover:bg-green-100 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/20 dark:hover:text-green-300"
                title="Refresh location"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Custom Location Input - Shows when custom is selected */}
      {locationType === 'custom' && (
        <div className="relative mt-2">
          <div className="bg-primary absolute top-0 bottom-0 left-0 w-1 rounded-full" />
          <FormItem className="ml-4">
            <CustomFormLabel className="mb-1 text-sm">
              Search for a location
            </CustomFormLabel>
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
        </div>
      )}
    </div>
  )
}
