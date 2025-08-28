'use client'

import { handlePlaceSearchBatch } from '@/actions/discover.actions'
import { generateSearchTitle } from '@/actions/generate-search-title.actions'
import {
  getLatestSearchFromHistory,
  saveSearchToHistory,
  updateSearchHistoryResults,
} from '@/actions/history.actions'
import { mapSearchToFormFilters } from '@/actions/map-search-to-form.actions'
import { savePlaceAction } from '@/actions/place.actions'
import { SearchFormModal } from '@/components/discovery/form/DiscoverFormModal'
import DiscoveryResult from '@/components/discovery/result/DiscoveryResult'
import { LocationInfo, reverseGeocode } from '@/lib/geocoding.service'
import { OptimizedSearchContext, PlaceResultItem } from '@/types/result.types'
import type {
  FormValues,
  SearchHistoryRecord,
  SearchQuery,
} from '@/types/search-history.types'
import {
  discoveryFormSchema,
  type DiscoveryFormValues,
} from '@/validation/discover-form.validation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

// Helper function to reconstruct search context from saved results
function reconstructSearchContext(
  results: PlaceResultItem[],
  batchNumber: number
): OptimizedSearchContext {
  // Convert results to minimal context
  const previousPlaces = results.map((place) => ({
    name: place.name,
    lat: place.lat,
    long: place.long,
    landscape: place.landscape || 'park',
    activity: place.activity || 'walking',
    userFeedback: place.userFeedback,
  }))

  // Extract user preferences (for future use with like/dislike functionality)
  const likedPlaces = previousPlaces.filter((p) => p.userFeedback === 'liked')
  const dislikedPlaces = previousPlaces.filter(
    (p) => p.userFeedback === 'disliked'
  )

  const userPreferences = {
    likedLandscapes: [
      ...new Set(likedPlaces.map((p) => p.landscape).filter(Boolean)),
    ],
    dislikedLandscapes: [
      ...new Set(dislikedPlaces.map((p) => p.landscape).filter(Boolean)),
    ],
    likedActivities: [
      ...new Set(likedPlaces.map((p) => p.activity).filter(Boolean)),
    ],
    dislikedActivities: [
      ...new Set(dislikedPlaces.map((p) => p.activity).filter(Boolean)),
    ],
    likedPlaces,
    dislikedPlaces,
  }

  return {
    previousPlaces,
    userPreferences,
    batchNumber,
  }
}

function DiscoverPageComponent() {
  const searchParams = useSearchParams()
  // Local state for location handling - no longer using LocationProvider
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [userLocationInfo, setUserLocationInfo] = useState<LocationInfo | null>(
    null
  )

  const [isSearchOpen, setIsSearchOpen] = useState(false) // Start closed to prevent flash
  const [isPending, startTransition] = useTransition()
  const [placeResults, setPlaceResults] = useState<PlaceResultItem[] | null>(
    null
  )
  const [isLoadingNew, setIsLoadingNew] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true) // Track if we're loading search history
  const [isLoadingAIFilters, setIsLoadingAIFilters] = useState(false) // Track if we're loading AI-mapped filters
  const [hasProcessedQuery, setHasProcessedQuery] = useState(false) // Track if we've already processed the URL query
  const [hasPerformedSearch, setHasPerformedSearch] = useState(false) // Track if user has performed a search
  const [currentBatch, setCurrentBatch] = useState<number>(1) // Track current batch number
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(false) // Track if more results are available
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false) // Track if loading more results
  const [currentSearchQuery, setCurrentSearchQuery] =
    useState<FormValues | null>(null) // Track current search filters
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null) // Track AI-generated search title
  const [isNewSearch, setIsNewSearch] = useState(false) // Track if this is a completely new search vs editing existing
  const [searchContext, setSearchContext] =
    useState<OptimizedSearchContext | null>(null) // Track search context for iterations
  const [searchLocation, setSearchLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null) // Track the location used for the current search

  // Initialize form
  const form = useForm<DiscoveryFormValues>({
    resolver: zodResolver(discoveryFormSchema),
    defaultValues: {
      locationType: 'custom',
      activity: '',
      otherActivity: '',
      when: '',
      customDate: undefined,
      specialCare: undefined,
      otherSpecialCare: '',
      distance: 'less than 1 hour',
      transportType: 'public_transport',
      activityLevel: undefined, // Don't send unless user interacts
      activityDurationValue: undefined, // Don't send unless user interacts
      activityDurationUnit: undefined, // Don't send unless user interacts
      additionalInfo: '',
    },
  })

  // Get user location - only called when user selects current location
  const getLocation = useCallback(() => {
    setLocationError(null)
    setUserLocationInfo(null) // Clear previous location info
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }

          setUserLocation(location)
          setLocationError(null)

          // Perform reverse geocoding for current location with timeout
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
          enableHighAccuracy: false, // Use false for better battery life and faster response
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        }
      )
    } else {
      const errorMessage = 'Geolocation not supported by this browser.'
      setLocationError(errorMessage)
      toast.error(errorMessage)
    }
  }, [])

  // Load latest search from history on component mount
  useEffect(() => {
    async function loadLatestSearch() {
      setIsLoadingHistory(true)
      try {
        // Check if we have URL parameters - if so, don't load history
        const query = searchParams.get('q')
        const shortcut = searchParams.get('shortcut')

        if (query || shortcut) {
          // User came from homepage with search params, start fresh
          setIsSearchOpen(false) // Will be opened by the URL params effect
        } else {
          // Normal page load, try to load previous search
          const result = await getLatestSearchFromHistory()
          if (result.success && result.data) {
            const historyRecord = result.data as SearchHistoryRecord
            const { query, results } = historyRecord

            // Check if activity is a predefined option
            const predefinedActivities = [
              'hiking',
              'biking',
              'swimming',
              'relaxing',
              'photography',
            ]
            const isOtherActivity =
              query.activity && !predefinedActivities.includes(query.activity)

            // Check if date is a predefined option
            const predefinedDates = ['today', 'tomorrow', 'this_weekend']
            const isCustomDate =
              query.when && !predefinedDates.includes(query.when)
            let customDateValue: Date | undefined = undefined

            if (isCustomDate && query.when) {
              try {
                customDateValue = new Date(query.when)
                // Validate the date
                if (isNaN(customDateValue.getTime())) {
                  customDateValue = undefined
                }
              } catch {
                customDateValue = undefined
              }
            }

            const formValues = {
              locationType: historyRecord.location?.locationType || 'custom', // Use actual location type from history
              customLocation:
                historyRecord.location?.locationType === 'custom'
                  ? {
                      name: historyRecord.location?.locationName || '',
                      lat: historyRecord.location?.latitude || 0,
                      lng: historyRecord.location?.longitude || 0,
                    }
                  : undefined,
              activity: isOtherActivity ? 'other' : query.activity || '',
              otherActivity: isOtherActivity ? query.activity : '',
              when: isCustomDate ? 'custom' : query.when || 'today',
              customDate: customDateValue,
              specialCare: query.specialCare || undefined,
              otherSpecialCare: query.otherSpecialCare || '',
              distance: query.distance || 'less than 1 hour',
              transportType:
                query.transportType || ('public_transport' as const), // Use saved transport type or default
              activityLevel: query.activityLevel,
              activityDurationValue: query.activityDurationValue,
              activityDurationUnit: query.activityDurationUnit,
              additionalInfo: query.additionalInfo || '',
              locationName: historyRecord.location?.locationName,
            }

            // Set form values from saved search
            form.reset(formValues)
            setCurrentSearchQuery(formValues)

            // Set search location (where the previous search was performed)
            setSearchLocation({
              latitude: historyRecord.location?.latitude || 0,
              longitude: historyRecord.location?.longitude || 0,
            })

            // Don't restore userLocation/userLocationInfo from history
            // These should only be set when user actively requests current location
            setPlaceResults(results)
            setHasPerformedSearch(true) // Mark that we have previous search results

            // Restore search session metadata
            const currentBatch = historyRecord.current_batch || 1
            const hasMoreResults = historyRecord.has_more_results || false
            const savedTitle = historyRecord.title

            setCurrentBatch(currentBatch)
            setHasMoreResults(hasMoreResults)

            // Restore generated title if available
            if (savedTitle) {
              setGeneratedTitle(savedTitle)
            }

            // Reconstruct search context from saved results for continued diversity
            if (results.length > 0) {
              const reconstructedContext = reconstructSearchContext(
                results,
                currentBatch + 1
              )
              setSearchContext(reconstructedContext)
            }

            // Don't open search modal if we have previous results
            setIsSearchOpen(false)
          } else {
            // No previous search, show search modal
            setIsSearchOpen(true)
          }
        }
      } catch (error) {
        console.error('Error loading latest search:', error)
        // Fallback to showing search modal
        setIsSearchOpen(true)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadLatestSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Handle URL parameters for search query and shortcuts
  useEffect(() => {
    const query = searchParams.get('q')
    const shortcut = searchParams.get('shortcut')

    // Only process if we have a query/shortcut and haven't processed it yet
    if ((query || shortcut) && !hasProcessedQuery && !isLoadingHistory) {
      // Use AI to map search query or shortcut to form filters
      const processSearchQuery = async () => {
        setIsLoadingAIFilters(true)
        setHasProcessedQuery(true) // Mark as processed immediately to prevent duplicates

        try {
          const result = await mapSearchToFormFilters(
            query ? decodeURIComponent(query) : '',
            shortcut || undefined
          )

          if (result.success && result.data) {
            const mappedData = result.data

            // Check if activity is a predefined option
            const predefinedActivities = [
              'hiking',
              'biking',
              'swimming',
              'relaxing',
              'photography',
            ]
            const isOtherActivity =
              mappedData.activity &&
              !predefinedActivities.includes(mappedData.activity)

            // Check if date is a predefined option
            const predefinedDates = ['today', 'tomorrow', 'this_weekend']
            const isCustomDate =
              mappedData.when && !predefinedDates.includes(mappedData.when)
            let customDateValue: Date | undefined = undefined

            if (isCustomDate) {
              try {
                customDateValue = new Date(mappedData.when || '')
                // Validate the date
                if (isNaN(customDateValue.getTime())) {
                  customDateValue = undefined
                }
              } catch {
                customDateValue = undefined
              }
            }

            const formValues = {
              locationType: 'custom' as const, // Default to custom for URL-based searches
              customLocation: undefined,
              activity: isOtherActivity ? 'other' : mappedData.activity || '',
              otherActivity: isOtherActivity ? mappedData.activity : '',
              when: isCustomDate ? 'custom' : mappedData.when || 'today',
              customDate: customDateValue,
              specialCare: mappedData.specialCare || undefined,
              otherSpecialCare: mappedData.otherSpecialCare || '',
              distance: mappedData.distance || 'less than 1 hour',
              transportType: mappedData.transportType || 'public_transport',
              activityLevel: mappedData.activityLevel || 3,
              activityDurationValue: mappedData.activityDurationValue || 4,
              activityDurationUnit: mappedData.activityDurationUnit || 'hours',
              additionalInfo:
                mappedData.additionalInfo ||
                (query ? decodeURIComponent(query) : ''),
              locationName: undefined,
            }

            // Update form with AI-mapped values
            form.reset(formValues)
            setCurrentSearchQuery(formValues)
          } else {
            // Fallback to original behavior
            if (query) {
              form.setValue('additionalInfo', decodeURIComponent(query))
            }
          }
        } catch (error) {
          console.error('Error mapping search query:', error)
          // Fallback to original behavior
          if (query) {
            form.setValue('additionalInfo', decodeURIComponent(query))
          }
        } finally {
          setIsLoadingAIFilters(false)
        }
      }

      processSearchQuery()

      // Open the search modal so user can review and complete the form
      setIsSearchOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hasProcessedQuery, isLoadingHistory, userLocation])

  // Form submission handler with progressive search
  function onSubmit(values: DiscoveryFormValues) {
    // Determine the location to use based on user selection
    let selectedLocation: { latitude: number; longitude: number }
    let selectedLocationName: string | undefined

    if (values.locationType === 'current') {
      if (!userLocation) {
        toast.error('Please allow location access and try again.')
        getLocation() // Try to get location again
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

    // Store current search query for filter display FIRST to show filters immediately
    setCurrentSearchQuery({
      ...values,
      locationName: selectedLocationName || 'Unknown location',
    })

    // Update search location to the selected location
    setSearchLocation(selectedLocation)

    // Close modal immediately and clear results only when starting new search
    setIsSearchOpen(false)
    setIsLoadingNew(true)
    setPlaceResults(null) // Clear previous results
    setHasPerformedSearch(true) // Mark that a search is being performed
    setCurrentBatch(1) // Reset to first batch
    setHasMoreResults(false) // Reset more results flag
    setGeneratedTitle(null) // Clear previous generated title
    setSearchContext(null) // Reset search context for new search

    startTransition(async () => {
      // Create payload for search (simplified - no encoding/decoding needed)
      const finalActivity =
        values.activity === 'other'
          ? values.otherActivity || ''
          : values.activity

      // Convert when value to proper format for AI
      let finalWhen = values.when
      if (values.when === 'custom' && values.customDate) {
        finalWhen = values.customDate.toISOString()
      }

      const payload: SearchQuery = {
        activity: finalActivity,
        when: finalWhen,
        specialCare: values.specialCare,
        otherSpecialCare: values.otherSpecialCare,
        distance: values.distance,
        activityLevel: values.activityLevel,
        activityDurationValue: values.activityDurationValue,
        activityDurationUnit: values.activityDurationUnit,
        additionalInfo: values.additionalInfo,
        transportType: values.transportType,
      }

      const locationData = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        locationName: selectedLocationName || 'Unknown location',
        locationType: values.locationType,
        address:
          values.locationType === 'current'
            ? userLocationInfo?.fullResponse?.address
            : undefined,
        displayName:
          values.locationType === 'current'
            ? userLocationInfo?.fullResponse?.display_name
            : undefined,
      }

      try {
        // Convert form values to the format expected by generateSearchTitle
        const titleFormValues = {
          ...values,
          locationName: selectedLocationName,
        }

        // Only generate title when explicitly starting a new search (via "New Search" button)
        const titleGenerationPromise = (
          isNewSearch
            ? generateSearchTitle(titleFormValues)
            : Promise.resolve({
                success: true,
                data: { title: generatedTitle },
              })
        )
          .then((titleResult) => {
            if (titleResult.success && titleResult.data?.title) {
              setGeneratedTitle(titleResult.data.title)
              return titleResult.data.title
            }
            return null
          })
          .catch((error) => {
            console.error('Failed to generate search title:', error)
            return null
          })

        // Helper to get title for error cases
        const getErrorTitle = async (errorMessage?: string) => {
          try {
            const title = await titleGenerationPromise
            return (
              title ||
              (errorMessage
                ? `Search failed: ${errorMessage}`
                : 'Search failed')
            )
          } catch {
            return errorMessage
              ? `Search failed: ${errorMessage}`
              : 'Search failed'
          }
        }
        // Convert payload to the format expected by discover actions (old format without location selection fields)
        const actionPayload = {
          activity: finalActivity,
          when: finalWhen,
          distance: values.distance,
          activityLevel: values.activityLevel,
          activityDurationValue: values.activityDurationValue,
          activityDurationUnit: values.activityDurationUnit,
          location: selectedLocation,
          locationName: selectedLocationName,
          specialCare: values.specialCare,
          otherSpecialCare: values.otherSpecialCare,
          additionalInfo: values.additionalInfo,
          transportType: values.transportType,
        }

        // Get first batch of results
        const batchResult = await handlePlaceSearchBatch(actionPayload, 1, null)

        // Handle different error types appropriately
        if (!batchResult.success) {
          const error = batchResult.error

          // Show user-friendly error message
          if (error?.userFriendlyMessage) {
            toast.error(error.userFriendlyMessage)
          } else {
            toast.error('Failed to fetch trip results. Please try again.')
          }

          // Log technical details for debugging
          console.error('Search error:', {
            type: error?.type,
            message: error?.message,
            details: error?.details,
            retryable: error?.retryable,
          })

          // Set empty results
          setPlaceResults([])

          // Save search to history even with error for user reference
          try {
            const errorTitle = await getErrorTitle(
              error?.userFriendlyMessage || error?.message
            )
            await saveSearchToHistory(
              payload,
              [], // Empty results for failed search
              {
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
                locationName: selectedLocationName || 'Unknown location',
                locationType: values.locationType,
              },
              false, // No more results
              1,
              errorTitle
            )
          } catch (historyError) {
            console.error(
              'Failed to save failed search to history:',
              historyError
            )
          }

          return // Exit early on error
        }

        // Handle successful results
        if (batchResult.data && batchResult.success) {
          const batchPlaces = Array.isArray(batchResult.data)
            ? batchResult.data
            : []

          // Update UI with first batch results
          setPlaceResults(batchPlaces as PlaceResultItem[])
          setCurrentBatch(1)
          setHasMoreResults(batchResult.hasMore || false)

          // Store search context for subsequent iterations
          if (batchResult.searchContext) {
            setSearchContext(batchResult.searchContext)
          }

          if (batchPlaces.length > 0) {
            // Save successful search to history
            try {
              const generatedTitle = await titleGenerationPromise
              await saveSearchToHistory(
                payload,
                batchPlaces,
                locationData,
                batchResult.hasMore || false,
                1,
                generatedTitle || undefined
              )
            } catch (error) {
              console.error('Failed to save search to history:', error)
              // Don't show error to user as this is not critical
            }
          } else {
            toast.info('No trips found matching your criteria.')

            // Save search with no results to history
            try {
              const noResultsTitle = await getErrorTitle(
                'No results found for this search'
              )
              await saveSearchToHistory(
                payload,
                [],
                locationData,
                false,
                1,
                noResultsTitle
              )
            } catch (error) {
              console.error(
                'Failed to save no-results search to history:',
                error
              )
            }
          }
        }
      } catch (error) {
        console.error('Unexpected error fetching trip results:', error)
        toast.error('An unexpected error occurred. Please try again.')
        setPlaceResults([])

        // Save unexpected error to history
        try {
          const errorTitle = 'Unexpected error occurred during search'
          await saveSearchToHistory(
            payload,
            [],
            locationData,
            false,
            1,
            errorTitle
          )
        } catch (historyError) {
          console.error('Failed to save error search to history:', historyError)
        }
      } finally {
        setIsLoadingNew(false)
        setIsNewSearch(false) // Reset flag after search completion
      }
    })
  }

  // Save trip handler
  const handleSavePlace = async (place: PlaceResultItem) => {
    const result = await savePlaceAction(place)
    if (result.success) {
      toast.success(`"${place.name}" saved successfully!`)
    } else {
      toast.error(result.error || 'Failed to save place. Please try again.')
    }
  }

  // Load more results handler
  const handleLoadMore = async () => {
    if (!searchLocation || !placeResults || isLoadingMore || !hasMoreResults) {
      return
    }

    setIsLoadingMore(true)

    try {
      const formValues = form.getValues()
      const finalActivity =
        formValues.activity === 'other'
          ? formValues.otherActivity || ''
          : formValues.activity
      let finalWhen = formValues.when
      if (formValues.when === 'custom' && formValues.customDate) {
        finalWhen = formValues.customDate.toISOString()
      }

      const actionPayload = {
        activity: finalActivity,
        when: finalWhen,
        distance: formValues.distance,
        activityLevel: formValues.activityLevel,
        activityDurationValue: formValues.activityDurationValue,
        activityDurationUnit: formValues.activityDurationUnit,
        location: {
          latitude: searchLocation.latitude,
          longitude: searchLocation.longitude,
        },
        specialCare: formValues.specialCare,
        otherSpecialCare: formValues.otherSpecialCare,
        additionalInfo: formValues.additionalInfo,
        transportType: formValues.transportType,
      }

      const nextBatch = currentBatch + 1
      const batchResult = await handlePlaceSearchBatch(
        actionPayload,
        nextBatch,
        searchContext
      )

      if (batchResult?.error) {
        toast.error(batchResult.error.message)
      } else if (batchResult?.data && batchResult.success) {
        const newPlaces = Array.isArray(batchResult.data)
          ? batchResult.data
          : []

        if (newPlaces.length > 0) {
          // Append new results to existing ones
          const updatedResults = placeResults
            ? [...placeResults, ...newPlaces]
            : newPlaces
          setPlaceResults(updatedResults)
          setCurrentBatch(nextBatch)
          setHasMoreResults(batchResult.hasMore || false)

          // Update search context with new places
          if (batchResult.searchContext) {
            setSearchContext(batchResult.searchContext)
          }

          // Update search history with all results
          try {
            await updateSearchHistoryResults(
              updatedResults,
              batchResult.hasMore || false,
              nextBatch
            )
          } catch (error) {
            console.error('Failed to update search history:', error)
            // Don't show error to user as this is not critical
          }
        } else {
          setHasMoreResults(false)
          toast.info('No more destinations found.')
        }
      }
    } catch (error) {
      console.error('Error loading more results:', error)
      toast.error('Failed to load more results. Please try again.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Handle title editing
  const handleTitleEdit = async (newTitle: string) => {
    setGeneratedTitle(newTitle)

    // Update search history with new title
    if (placeResults && placeResults.length > 0) {
      try {
        await updateSearchHistoryResults(
          placeResults,
          hasMoreResults,
          currentBatch,
          newTitle
        )
      } catch (error) {
        console.error('Failed to update search history with new title:', error)
      }
    }
  }

  return (
    <>
      {/* Search Form Modal */}
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
        isLoadingAIFilters={isLoadingAIFilters}
      />

      <DiscoveryResult
        placeResults={placeResults as PlaceResultItem[] | null}
        title="Discover Nature Trips"
        baseLocation={searchLocation || userLocation}
        isLoadingNew={isLoadingNew}
        isLoadingHistory={isLoadingHistory}
        emptyStateMessage={
          hasPerformedSearch
            ? 'No trips found matching your criteria'
            : `Welcome to ${process.env.NEXT_PUBLIC_PRODUCT_NAME}! Start your first nature discovery...`
        }
        onSavePlace={handleSavePlace}
        hasMoreResults={hasMoreResults}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        onNewSearch={() => {
          // Reset form to default values for new search
          form.reset({
            locationType: 'custom',
            customLocation: undefined,
            activity: '',
            otherActivity: '',
            when: '',
            customDate: undefined,
            specialCare: undefined,
            otherSpecialCare: '',
            distance: 'less than 1 hour',
            transportType: 'public_transport',
            activityLevel: undefined,
            activityDurationValue: undefined,
            activityDurationUnit: undefined,
            additionalInfo: '',
          })
          // Mark this as a new search that should generate a new title
          setIsNewSearch(true)
          // Keep current results visible, only reset form in modal
          setIsSearchOpen(true)
        }}
        searchQuery={currentSearchQuery}
        generatedTitle={generatedTitle}
        onTitleEdit={handleTitleEdit}
        onEditFilters={() => {
          // Mark this as editing existing search, not a new search
          setIsNewSearch(false)
          // Pre-fill form with current search values for editing
          if (currentSearchQuery) {
            form.reset({
              locationType: currentSearchQuery.locationType || 'custom',
              customLocation: currentSearchQuery.customLocation || undefined,
              activity: currentSearchQuery.activity || '',
              otherActivity: currentSearchQuery.otherActivity || '',
              when: currentSearchQuery.when || '',
              customDate: currentSearchQuery.customDate || undefined,
              specialCare: currentSearchQuery.specialCare || undefined,
              otherSpecialCare: currentSearchQuery.otherSpecialCare || '',
              distance: currentSearchQuery.distance || 'less than 1 hour',
              transportType:
                currentSearchQuery.transportType || 'public_transport',
              activityLevel: currentSearchQuery.activityLevel || 3,
              activityDurationValue:
                currentSearchQuery.activityDurationValue || 4,
              activityDurationUnit:
                currentSearchQuery.activityDurationUnit || 'hours',
              additionalInfo: currentSearchQuery.additionalInfo || '',
            })
          }
          setIsSearchOpen(true)
        }}
      />
    </>
  )
}

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverPageComponent />
    </Suspense>
  )
}
