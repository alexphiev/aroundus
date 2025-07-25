'use client'

import { Button } from '@/components/ui/button'
import { SelectionGrid } from '@/components/ui/custom/selection-grid'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { type LocationSuggestion } from '@/lib/location-autocomplete.service'
import { cn } from '@/lib/utils'
import { DiscoveryFormValues } from '@/validation/discover-form.validation'
import {
  CheckCircle,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Control } from 'react-hook-form'
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
  // Add form control for validation
  control?: Control<DiscoveryFormValues>
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
  control,
}: LocationSelectionProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)

  const handleGetCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true)
    try {
      onRetryLocation()
    } finally {
      setIsGettingLocation(false)
    }
  }, [onRetryLocation])

  // Auto-trigger location request when current location is selected and no location exists
  useEffect(() => {
    if (
      locationType === 'current' &&
      !userLocation &&
      !locationError &&
      !isGettingLocation
    ) {
      handleGetCurrentLocation()
    }
  }, [
    locationType,
    userLocation,
    locationError,
    isGettingLocation,
    handleGetCurrentLocation,
  ])

  // Track geocoding state
  useEffect(() => {
    if (userLocation && !userLocationInfo && !locationError) {
      setIsGeocoding(true)
    } else {
      setIsGeocoding(false)
    }
  }, [userLocation, userLocationInfo, locationError])

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
        <CustomFormLabel
          className={cn(
            control?.getFieldState('customLocation')?.error &&
              locationType === 'custom'
              ? 'text-destructive'
              : ''
          )}
        >
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
                  disabled={isGettingLocation || disabled}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  {isGettingLocation ? 'Getting...' : 'Retry'}
                </Button>
              </div>
            )}
          </div>

          {/* Loading States */}
          {isGettingLocation && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Getting your current location...
              </p>
            </div>
          )}

          {isGeocoding && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Loading...
              </p>
            </div>
          )}

          {/* Current Location Display */}
          {userLocation && userLocationInfo && !isGeocoding && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div className="min-w-0">
                <p className="truncate text-sm text-green-600 dark:text-green-400">
                  {userLocationInfo.locationName}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGetCurrentLocation}
                disabled={isGettingLocation || disabled}
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
            {/* Add validation error for customLocation field */}
            {control && (
              <FormField
                control={control}
                name="customLocation"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </FormItem>
        </div>
      )}
    </div>
  )
}
