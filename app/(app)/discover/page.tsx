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
import { useLocationContext } from '@/components/providers/LocationProvider'
import {
  discoveryFormSchema,
  type DiscoveryFormValues,
} from '@/schemas/form.schema'
import { OptimizedSearchContext, PlaceResultItem } from '@/types/result.types'
import type {
  FormValues,
  SearchHistoryRecord,
  SearchQuery,
} from '@/types/search-history.types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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

function DiscoverPageContent() {
  const searchParams = useSearchParams()
  const { userLocation, locationInfo, locationError, setUserLocation } =
    useLocationContext()
  const [isSearchOpen, setIsSearchOpen] = useState(false) // Start closed to prevent flash
  const [isPending, startTransition] = useTransition()
  const [placeResults, setPlaceResults] = useState<PlaceResultItem[] | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
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
  const [searchContext, setSearchContext] =
    useState<OptimizedSearchContext | null>(null) // Track search context for iterations

  // Initialize form
  const form = useForm<DiscoveryFormValues>({
    resolver: zodResolver(discoveryFormSchema),
    defaultValues: {
      activity: '',
      otherActivity: '',
      when: '',
      customDate: undefined,
      specialCare: undefined,
      otherSpecialCare: '',
      distance: '1 hour',
      transportType: 'public_transport',
      activityLevel: 3,
      activityDurationValue: 4,
      activityDurationUnit: 'hours',
      additionalInfo: '',
    },
  })

  // Get user location using the context
  const getLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          toast.success('Location acquired!')
        },
        (error) => {
          console.error('Error getting location: ', error)
          toast.error('Failed to acquire location.')
        }
      )
    } else {
      toast.error('Geolocation not supported.')
    }
  }, [setUserLocation])

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
          getLocation()
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

            if (isCustomDate) {
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
              activity: isOtherActivity ? 'other' : query.activity || '',
              otherActivity: isOtherActivity ? query.activity : '',
              when: isCustomDate ? 'custom' : query.when || 'today',
              customDate: customDateValue,
              specialCare: query.specialCare || undefined,
              otherSpecialCare: query.otherSpecialCare || '',
              distance: query.distance || '1 hour',
              transportType:
                query.transportType || ('public_transport' as const), // Use saved transport type or default
              activityLevel: query.activityLevel,
              activityDurationValue: query.activityDurationValue,
              activityDurationUnit: query.activityDurationUnit,
              additionalInfo: query.additionalInfo || '',
            }

            // Set form values from saved search
            form.reset(formValues)
            setCurrentSearchQuery(formValues)

            // Set location and results
            setUserLocation({
              latitude: query.location.latitude,
              longitude: query.location.longitude,
            })
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
            // No previous search, get location and show search modal
            getLocation()
            setIsSearchOpen(true)
          }
        }
      } catch (error) {
        console.error('Error loading latest search:', error)
        // Fallback to getting location and showing search modal
        getLocation()
        setIsSearchOpen(true)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadLatestSearch()
  }, [form, getLocation, searchParams, setUserLocation])

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
              activity: isOtherActivity ? 'other' : mappedData.activity || '',
              otherActivity: isOtherActivity ? mappedData.activity : '',
              when: isCustomDate ? 'custom' : mappedData.when || 'today',
              customDate: customDateValue,
              specialCare: mappedData.specialCare || undefined,
              otherSpecialCare: mappedData.otherSpecialCare || '',
              distance: mappedData.distance || '1 hour',
              transportType: mappedData.transportType || 'public_transport',
              activityLevel: mappedData.activityLevel || 3,
              activityDurationValue: mappedData.activityDurationValue || 4,
              activityDurationUnit: mappedData.activityDurationUnit || 'hours',
              additionalInfo:
                mappedData.additionalInfo ||
                (query ? decodeURIComponent(query) : ''),
            }

            // Update form with AI-mapped values
            form.reset(formValues)
            setCurrentSearchQuery(formValues)

            toast.success('Search preferences pre-filled based on your query!')
          } else {
            // Fallback to original behavior
            if (query) {
              form.setValue('additionalInfo', decodeURIComponent(query))
            }
            toast.info('Complete the form to search for trips')
          }
        } catch (error) {
          console.error('Error mapping search query:', error)
          // Fallback to original behavior
          if (query) {
            form.setValue('additionalInfo', decodeURIComponent(query))
          }
          toast.info('Complete the form to search for trips')
        } finally {
          setIsLoadingAIFilters(false)
        }
      }

      processSearchQuery()

      // Open the search modal so user can review and complete the form
      setIsSearchOpen(true)
      // Get location if not already set
      if (!userLocation) {
        getLocation()
      }
    }
  }, [
    searchParams,
    hasProcessedQuery,
    isLoadingHistory,
    userLocation,
    form,
    getLocation,
  ])

  // Form submission handler with progressive search
  function onSubmit(values: DiscoveryFormValues) {
    if (!userLocation) {
      toast.error('Please allow location access to search for trips.')
      getLocation() // Try to get location again
      return
    }

    // Close modal immediately and clear results only when starting new search
    setIsSearchOpen(false)
    setIsLoading(true)
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
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        locationName: locationInfo?.locationName,
        additionalInfo: values.additionalInfo,
        transportType: values.transportType,
      }

      // Store current search query for filter display
      setCurrentSearchQuery(values)

      try {
        // Only generate title if one doesn't already exist
        const titleGenerationPromise = generatedTitle
          ? Promise.resolve(generatedTitle)
          : generateSearchTitle({
              ...values,
              locationName: locationInfo?.locationName,
            })
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
        // Convert payload to the format expected by discover actions
        const actionPayload = {
          activity: finalActivity,
          when: finalWhen,
          distance: values.distance,
          activityLevel: values.activityLevel,
          activityDurationValue: values.activityDurationValue,
          activityDurationUnit: values.activityDurationUnit,
          location: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
          locationName: locationInfo?.locationName,
          specialCare: values.specialCare,
          otherSpecialCare: values.otherSpecialCare,
          additionalInfo: values.additionalInfo,
          transportType: values.transportType,
        }

        // Get first batch of results
        const batchResult = await handlePlaceSearchBatch(actionPayload, 1, null)

        if (batchResult?.error) {
          toast.error(batchResult.error)
          setPlaceResults([])
        } else if (batchResult?.data && batchResult.success) {
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
            toast.success(`Found ${batchPlaces.length} great destinations!`)

            // Save search to history with generated title
            try {
              const generatedTitle = await titleGenerationPromise
              await saveSearchToHistory(
                payload,
                batchPlaces,
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
          }
        }
      } catch (error) {
        console.error('Error fetching trip results:', error)
        toast.error('Failed to fetch trip results. Please try again.')
        setPlaceResults([])
      } finally {
        setIsLoading(false)
      }
    })
  }

  // Save trip handler
  const handleSavePlace = async (place: PlaceResultItem) => {
    toast.info(`Saving "${place.name}"...`)
    const result = await savePlaceAction(place)
    if (result.success) {
      toast.success(`"${place.name}" saved successfully!`)
    } else {
      toast.error(result.error || 'Failed to save place. Please try again.')
    }
  }

  // Load more results handler
  const handleLoadMore = async () => {
    if (!userLocation || !placeResults || isLoadingMore || !hasMoreResults) {
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
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
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
        toast.error(batchResult.error)
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

          toast.success(`Found ${newPlaces.length} more destinations!`)
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

  // Show loading state while checking for search history
  if (isLoadingHistory) {
    return (
      <div className="h-screen flex ml-[60px]">
        <div className="w-full md:w-1/2 flex flex-col h-full px-6">
          <div className="flex-shrink-0 pt-6 pb-4 bg-background">
            <h1 className="text-3xl font-bold mb-2">Discover Nature Trips</h1>
            <p className="text-muted-foreground">
              Loading your previous search...
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                Checking for previous searches...
              </p>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/2 h-screen bg-muted">
          {/* Empty map area during loading */}
        </div>
      </div>
    )
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
        isLoadingAIFilters={isLoadingAIFilters}
      />

      {/* Use the new MapResult component */}
      <DiscoveryResult
        placeResults={placeResults as PlaceResultItem[] | null}
        title="Discover Nature Trips"
        subtitle="Find the perfect nature spot based on your preferences"
        userLocation={userLocation}
        isLoading={isLoading && (!placeResults || placeResults.length === 0)}
        onSearchClick={() => setIsSearchOpen(true)}
        emptyStateMessage={
          hasPerformedSearch
            ? 'No trips found matching your criteria'
            : 'Discover places around you'
        }
        onSavePlace={handleSavePlace}
        hasMoreResults={hasMoreResults}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        onNewSearch={() => {
          // Reset form to default values for new search
          form.reset({
            activity: '',
            otherActivity: '',
            when: '',
            customDate: undefined,
            specialCare: undefined,
            otherSpecialCare: '',
            distance: '1 hour',
            transportType: 'public_transport',
            activityLevel: 3,
            activityDurationValue: 4,
            activityDurationUnit: 'hours',
            additionalInfo: '',
          })
          // Keep current results visible, only reset form in modal
          setIsSearchOpen(true)
        }}
        searchQuery={currentSearchQuery}
        generatedTitle={generatedTitle}
        onTitleEdit={handleTitleEdit}
        onEditFilters={() => {
          // Pre-fill form with current search values for editing
          if (currentSearchQuery) {
            form.reset({
              activity: currentSearchQuery.activity || '',
              otherActivity: currentSearchQuery.otherActivity || '',
              when: currentSearchQuery.when || '',
              customDate: currentSearchQuery.customDate || undefined,
              specialCare: currentSearchQuery.specialCare || undefined,
              otherSpecialCare: currentSearchQuery.otherSpecialCare || '',
              distance: currentSearchQuery.distance || '1 hour',
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
    <Suspense
      fallback={
        <div className="h-screen flex ml-[60px]">
          <div className="w-full md:w-1/2 flex flex-col h-full px-6">
            <div className="flex-shrink-0 pt-6 pb-4 bg-background">
              <h1 className="text-3xl font-bold mb-2">Discover Nature</h1>
              <p className="text-muted-foreground">Loading...</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading page...</p>
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 h-screen bg-muted">
            {/* Empty map area during loading */}
          </div>
        </div>
      }
    >
      <DiscoverPageContent />
    </Suspense>
  )
}
