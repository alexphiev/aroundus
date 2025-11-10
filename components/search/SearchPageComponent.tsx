'use client'

import { BoundingBox, ParkGeometry } from '@/actions/explore.actions'
import { searchPlacesAction } from '@/actions/search.actions'
import { SearchFormModal } from '@/components/search/form/SearchFormModal'
import SearchFiltersBar from '@/components/search/result/SearchFiltersBar'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { LocationInfo, reverseGeocode } from '@/lib/geocoding.service'
import type { SearchFilters, SearchFormValues } from '@/types/search.types'
import { SearchPlaceInView } from '@/types/search.types'
import { distanceToRadiusKm } from '@/utils/distance.utils'
import { mapActivityToPlaceTypes } from '@/utils/place.utils'
import { searchFormSchema } from '@/validation/search-form.validation'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
// import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import Map from './result/Map'
import SearchResults from './result/SearchResults'

interface SearchPageComponentProps {
  parkGeometries: ParkGeometry[]
}

function SearchPageComponent({ parkGeometries }: SearchPageComponentProps) {
  // const searchParams = useSearchParams()
  // const router = useRouter()

  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [userLocationInfo, setUserLocationInfo] = useState<LocationInfo | null>(
    null
  )

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [placeResults, setPlaceResults] = useState<SearchPlaceInView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentFilters, setCurrentFilters] = useState<SearchFilters | null>(
    null
  )
  const [mapCenter, setMapCenter] = useState<{
    latitude: number
    longitude: number
  }>({
    latitude: 46.603354,
    longitude: 1.888334,
  })
  const [selectedPlace, setSelectedPlace] = useState<SearchPlaceInView | null>(
    null
  )
  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1)
  const [hoveredPlace, setHoveredPlace] = useState<SearchPlaceInView | null>(
    null
  )

  const boundsChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingRef = useRef(false)
  const lastSearchCenterRef = useRef<{
    latitude: number
    longitude: number
  } | null>(null)
  const lastBoundsRef = useRef<BoundingBox | null>(null)
  const currentFiltersRef = useRef<SearchFilters | null>(null)
  const mapCenterCallbackRef = useRef<
    ((lat: number, lng: number) => void) | null
  >(null)

  const form = useForm<SearchFormValues>({
    resolver: standardSchemaResolver(searchFormSchema),
    defaultValues: {
      locationType: 'custom',
      distance: 'less than 1 hour',
      transportType: 'public_transport',
    },
  })

  // Set filters from search params
  // useEffect(() => {
  //   if (currentFilters === null) {
  //     const distance = searchParams.get('distance')
  //     const transport = searchParams.get('transport')
  //     const locationName = searchParams.get('location')
  //     const activity = searchParams.get('activity')

  //     const filters: SearchFilters = {
  //       distance: distance || 'less than 1 hour',
  //       transportType: transport || 'public_transport',
  //       activity: activity || undefined,
  //       locationName: locationName || undefined,
  //     }
  //     setCurrentFilters(filters)
  //   }
  // }, [searchParams])

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
          setMapCenter(location)
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
            .catch(() => {})
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

  const performFilteredSearch = useCallback(
    async (
      filters: SearchFilters,
      location: { latitude: number; longitude: number }
    ) => {
      if (isLoadingRef.current) {
        return
      }

      lastSearchCenterRef.current = location

      try {
        isLoadingRef.current = true
        setIsLoading(true)

        const radiusKm = distanceToRadiusKm(
          filters.distance,
          filters.transportType
        )

        const places = await searchPlacesAction({
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm,
          limit: 50,
        })

        if (!places) {
          toast.error('Failed to find places. Please try again.')
          setPlaceResults([])
          return
        }

        const filteredPlaces = places.filter((place) => {
          if (filters.activity) {
            const activityTypes = mapActivityToPlaceTypes(filters.activity)
            return activityTypes.includes(place.type)
          }
          return true
        })

        if (filteredPlaces.length === 0) {
          toast.info('No places found matching your filters.')
        }

        setPlaceResults(places)
      } catch (error) {
        console.error('Search error:', error)
        toast.error('An unexpected error occurred. Please try again.')
        setPlaceResults([])
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    []
  )

  // useEffect(() => {
  //   if (hasInitializedFromUrlRef.current) {
  //     return
  //   }

  //   const lat = searchParams.get('lat')
  //   const lng = searchParams.get('lng')
  //   const distance = searchParams.get('distance')
  //   const transport = searchParams.get('transport')
  //   const locationName = searchParams.get('location')
  //   const activity = searchParams.get('activity')

  //   if (lat && lng && distance && transport) {
  //     hasInitializedFromUrlRef.current = true

  //     const location = {
  //       latitude: parseFloat(lat),
  //       longitude: parseFloat(lng),
  //     }

  //     const filters: SearchFilters = {
  //       distance,
  //       transportType: transport as
  //         | 'public_transport'
  //         | 'car'
  //         | 'foot'
  //         | 'bike',
  //       activity: activity || undefined,
  //       locationName: locationName || undefined,
  //     }

  //     setCurrentFilters(filters)
  //     setMapCenter(location)

  //     form.reset({
  //       locationType: 'custom',
  //       customLocation: locationName
  //         ? {
  //             name: locationName,
  //             lat: location.latitude,
  //             lng: location.longitude,
  //           }
  //         : undefined,
  //       distance,
  //       transportType: transport as
  //         | 'public_transport'
  //         | 'car'
  //         | 'foot'
  //         | 'bike',
  //       activity: activity || undefined,
  //     })

  //     performFilteredSearch(filters, location)
  //   }
  // }, [form, performFilteredSearch, searchParams])

  const fetchPlacesInBounds = useCallback(async (bounds: BoundingBox) => {
    if (isLoadingRef.current) {
      return
    }

    try {
      isLoadingRef.current = true
      setIsLoading(true)
      // Use search_places_by_location to ensure distance_km is always available
      // Calculate center and radius from bounds
      const center = {
        latitude: (bounds.north + bounds.south) / 2,
        longitude: (bounds.east + bounds.west) / 2,
      }
      // Calculate approximate radius in km from bounds
      // Using Haversine formula approximation for diagonal distance
      const latDiff = bounds.north - bounds.south
      const lngDiff = bounds.east - bounds.west
      const avgLat = center.latitude
      const latKm = latDiff * 111 // 1 degree latitude ≈ 111 km
      const lngKm = lngDiff * 111 * Math.cos((avgLat * Math.PI) / 180)
      const radiusKm = Math.max(latKm, lngKm) / 2 // Use half of the larger dimension

      // Use search_places_by_location to get places with distance_km
      const places = await searchPlacesAction({
        latitude: center.latitude,
        longitude: center.longitude,
        radiusKm: Math.max(radiusKm, 10), // Minimum 10km radius
        limit: 50, // Show more places when panning
      })
      setPlaceResults(places)
    } catch (error) {
      console.error('Error fetching places:', error)
      toast.error('Failed to load places')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [])

  useEffect(() => {
    currentFiltersRef.current = currentFilters
  }, [currentFilters])

  const handleBoundsChange = useCallback(
    (bounds: BoundingBox) => {
      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current)
      }

      const lastBounds = lastBoundsRef.current
      if (lastBounds) {
        const latDiff =
          Math.abs(bounds.north - lastBounds.north) +
          Math.abs(bounds.south - lastBounds.south)
        const lngDiff =
          Math.abs(bounds.east - lastBounds.east) +
          Math.abs(bounds.west - lastBounds.west)
        const threshold = 0.001

        if (latDiff < threshold && lngDiff < threshold) {
          return
        }
      }

      boundsChangeTimeoutRef.current = setTimeout(() => {
        lastBoundsRef.current = bounds

        if (!currentFiltersRef.current) {
          fetchPlacesInBounds(bounds)
        } else {
          const center = {
            latitude: (bounds.north + bounds.south) / 2,
            longitude: (bounds.east + bounds.west) / 2,
          }
          performFilteredSearch(currentFiltersRef.current, center)
        }
      }, 1000)
    },
    [fetchPlacesInBounds, performFilteredSearch]
  )

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

    const filters: SearchFilters = {
      distance: values.distance,
      transportType: values.transportType,
      activity: values.activity,
      locationName: selectedLocationName,
    }

    setCurrentFilters(filters)
    setMapCenter(selectedLocation)
    setIsSearchOpen(false)

    // const params = new URLSearchParams()
    // params.set('lat', selectedLocation.latitude.toString())
    // params.set('lng', selectedLocation.longitude.toString())
    // params.set('distance', values.distance)
    // params.set('transport', values.transportType)
    // if (selectedLocationName) {
    //   params.set('location', selectedLocationName)
    // }
    // if (values.activity) {
    //   params.set('activity', values.activity)
    // }

    // router.push(`/search?${params.toString()}`, { scroll: false })

    performFilteredSearch(filters, selectedLocation)
  }

  const handleEditFilters = () => {
    setIsSearchOpen(true)
  }

  const handleClearFilters = useCallback(() => {
    setCurrentFilters(null)
  }, [])

  const handlePlaceSelect = useCallback(
    (
      index: number,
      place: SearchPlaceInView | null,
      shouldCenterMap = false
    ) => {
      setActiveCardIndex(index)
      setSelectedPlace(place)

      // Clear hover state when going back to cards view
      if (place === null) {
        setHoveredPlace(null)
      }

      // Center map on place if requested (e.g., when clicking a card)
      if (shouldCenterMap && place && mapCenterCallbackRef.current) {
        mapCenterCallbackRef.current(place.lat, place.long)
      }
    },
    []
  )

  const handlePlaceHover = useCallback((place: SearchPlaceInView | null) => {
    setHoveredPlace(place)
  }, [])

  const handleMapMarkerClick = useCallback(
    (index: number, place: SearchPlaceInView) => {
      setActiveCardIndex(index)
      setSelectedPlace(place)
      // Note: We don't center the map here because the user clicked directly on the map
    },
    []
  )

  const handleMapPopupClose = useCallback(() => {
    setActiveCardIndex(-1)
    setSelectedPlace(null)
  }, [])

  useEffect(() => {
    return () => {
      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <SearchFormModal
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        form={form}
        onSubmit={onSubmit}
        isPending={false}
        locationError={locationError}
        onRetryLocation={getLocation}
        userLocation={userLocation}
        userLocationInfo={userLocationInfo}
      />

      <div className="ml-0 flex h-[100dvh] flex-col md:ml-[60px]">
        {currentFilters && (
          <SearchFiltersBar
            filters={currentFilters}
            onEdit={handleEditFilters}
            onClear={handleClearFilters}
          />
        )}

        <div className="hidden h-full flex-1 md:block">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel
              defaultSize={50}
              minSize={30}
              className="h-full overflow-hidden"
            >
              <SearchResults
                places={placeResults}
                isLoading={isLoading}
                onNewSearch={() => setIsSearchOpen(true)}
                hasFilters={!!currentFilters}
                selectedPlace={selectedPlace}
                activeCardIndex={activeCardIndex}
                onPlaceSelect={handlePlaceSelect}
                onPlaceHover={handlePlaceHover}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={50} minSize={30} className="h-full">
              <Map
                places={placeResults}
                parkGeometries={parkGeometries}
                onBoundsChange={handleBoundsChange}
                activePlace={hoveredPlace || selectedPlace}
                onMarkerClick={handleMapMarkerClick}
                onPopupClose={handleMapPopupClose}
                onMapReady={(centerMap) => {
                  mapCenterCallbackRef.current = centerMap
                }}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* <div className="block flex-1 md:hidden">
          <div className="relative h-full">
            <SearchMap
              places={placeResults}
              center={mapCenter}
              onBoundsChange={handleBoundsChange}
              userLocation={userLocation}
            />
          </div>
        </div> */}
      </div>
    </>
  )
}

export default SearchPageComponent
