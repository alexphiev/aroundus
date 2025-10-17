'use client'

import { searchPlaces } from '@/actions/search.actions'
import { SearchFormModal } from '@/components/search/form/SearchFormModal'
import SearchResult from '@/components/search/result/SearchResult'
import { LocationInfo, reverseGeocode } from '@/lib/geocoding.service'
import { PlaceResultItem } from '@/types/result.types'
import type { SearchFormValues } from '@/validation/search-form.validation'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { searchFormSchema } from '@/validation/search-form.validation'
import { savePlaceAction } from '@/actions/place.actions'

interface SearchPlaceResult {
  id: string
  name: string
  description: string
  type: string
  source: string
  lat: number
  long: number
  score: number
  distance_km: number
  metadata: Record<string, unknown> | null
  website: string | null
  wikipedia_query: string | null
  country: string | null
  region: string | null
}

function convertPlaceToResultItem(place: SearchPlaceResult): PlaceResultItem {
  return {
    id: place.id,
    name: place.name || 'Unnamed Place',
    description: place.description || '',
    lat: place.lat,
    long: place.long,
    landscape: place.type || undefined,
    activity: undefined,
    photos: [],
    googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.long}`,
    googleMapsUri: undefined,
    starRating: undefined,
    starRatingReason: undefined,
  }
}

function SearchPageComponent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  console.log('📄 SearchPageComponent RENDER', {
    timestamp: Date.now(),
  })

  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [userLocationInfo, setUserLocationInfo] = useState<LocationInfo | null>(
    null
  )

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [placeResults, setPlaceResults] = useState<PlaceResultItem[] | null>(
    null
  )
  const [hasPerformedSearch, setHasPerformedSearch] = useState(false)
  const [currentSearchQuery, setCurrentSearchQuery] =
    useState<SearchFormValues | null>(null)
  const [searchLocation, setSearchLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const form = useForm<SearchFormValues>({
    resolver: standardSchemaResolver(searchFormSchema),
    defaultValues: {
      locationType: 'custom',
      distance: 'less than 1 hour',
      transportType: 'public_transport',
    },
  })

  const getLocation = useCallback(() => {
    setLocationError(null)
    setUserLocationInfo(null)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }

          setUserLocation(location)
          setLocationError(null)

          const geocodePromise = reverseGeocode(
            location.latitude,
            location.longitude
          )
          const timeoutPromise = new Promise<LocationInfo | null>((_, reject) =>
            setTimeout(
              () => reject(new Error('Reverse geocoding timeout')),
              10000
            )
          )

          Promise.race([geocodePromise, timeoutPromise])
            .then((locationInfo) => {
              if (locationInfo) {
                setUserLocationInfo(locationInfo)
              }
            })
            .catch(() => {
              // Reverse geocoding failed, but we still have location coordinates
            })
        },
        (error) => {
          let errorMessage = 'Failed to get location.'

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                'Location access denied. Please enable location permissions.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.'
              break
          }

          setLocationError(errorMessage)
          toast.error(errorMessage)
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        }
      )
    } else {
      const errorMessage = 'Geolocation not supported by this browser.'
      setLocationError(errorMessage)
      toast.error(errorMessage)
    }
  }, [])

  useEffect(() => {
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const distance = searchParams.get('distance')
    const transport = searchParams.get('transport')
    const locationName = searchParams.get('location')

    if (lat && lng && distance) {
      const location = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      }

      const searchQuery: SearchFormValues = {
        locationType: 'custom',
        customLocation: {
          name: locationName || 'Selected Location',
          lat: location.latitude,
          lng: location.longitude,
        },
        distance: distance || 'less than 1 hour',
        transportType: (transport as 'public_transport' | 'car') || 'public_transport',
        locationName: locationName || undefined,
      }

      form.reset(searchQuery)
      setCurrentSearchQuery(searchQuery)
      setSearchLocation(location)
      setHasPerformedSearch(true)

      performSearch(searchQuery, location)
    } else {
      getLocation()
      setIsInitializing(false)
    }
  }, [searchParams])

  async function performSearch(
    values: SearchFormValues,
    selectedLocation: { latitude: number; longitude: number }
  ) {
    try {
      const result = await searchPlaces(
        selectedLocation,
        values.distance,
        values.transportType
      )

      if (!result.success || !result.data) {
        toast.error('Failed to find places. Please try again.')
        setPlaceResults([])
        setIsInitializing(false)
        return
      }

      const places = result.data as SearchPlaceResult[]
      const convertedPlaces = places.map(convertPlaceToResultItem)

      if (convertedPlaces.length === 0) {
        toast.info('No places found in this area.')
      }

      setPlaceResults(convertedPlaces)
      setIsInitializing(false)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('An unexpected error occurred. Please try again.')
      setPlaceResults([])
      setIsInitializing(false)
    }
  }

  function onSubmit(values: SearchFormValues) {
    let selectedLocation: { latitude: number; longitude: number }
    let selectedLocationName: string | undefined

    if (values.locationType === 'current') {
      if (!userLocation) {
        toast.error('Please allow location access and try again.')
        getLocation()
        return
      }
      selectedLocation = userLocation
      selectedLocationName = userLocationInfo?.locationName
    } else if (values.locationType === 'custom') {
      if (!values.customLocation) {
        toast.error('Please select a location.')
        return
      }
      selectedLocation = {
        latitude: values.customLocation.lat,
        longitude: values.customLocation.lng,
      }
      selectedLocationName = values.customLocation.name
    } else {
      toast.error('Please select a location type.')
      return
    }

    setCurrentSearchQuery({
      ...values,
      locationName: selectedLocationName || 'Unknown location',
    })

    setSearchLocation(selectedLocation)
    setIsSearchOpen(false)

    const params = new URLSearchParams()
    params.set('lat', selectedLocation.latitude.toString())
    params.set('lng', selectedLocation.longitude.toString())
    params.set('distance', values.distance)
    params.set('transport', values.transportType)
    if (selectedLocationName) {
      params.set('location', selectedLocationName)
    }

    router.push(`/search?${params.toString()}`)

    startTransition(() => {
      performSearch(values, selectedLocation)
    })
  }

  const handleSavePlace = async (place: PlaceResultItem) => {
    const result = await savePlaceAction(place)
    if (result.success) {
      toast.success(`"${place.name}" saved successfully!`)
    } else {
      toast.error(result.error || 'Failed to save place. Please try again.')
    }
  }

  if (isInitializing) {
    return null
  }

  return (
    <>
      <SearchFormModal
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        form={form}
        onSubmit={onSubmit}
        isPending={isPending}
        locationError={locationError}
        onRetryLocation={getLocation}
        userLocation={userLocation}
        userLocationInfo={userLocationInfo}
      />

      <SearchResult
        placeResults={placeResults}
        title="Search Results"
        baseLocation={searchLocation || userLocation}
        isLoadingNew={false}
        emptyStateMessage={
          hasPerformedSearch
            ? 'No places found matching your search'
            : 'Search for places nearby'
        }
        onSavePlace={handleSavePlace}
        onNewSearch={() => {
          form.reset({
            locationType: 'custom',
            customLocation: undefined,
            distance: 'less than 1 hour',
            transportType: 'public_transport',
          })
          setIsSearchOpen(true)
        }}
        searchQuery={currentSearchQuery}
        showMapOnly={!hasPerformedSearch}
        userLocation={userLocation}
      />
    </>
  )
}

export default SearchPageComponent
