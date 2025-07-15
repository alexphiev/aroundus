'use client'

import { getSavedPlacesAction, savePlaceAction } from '@/actions/place.actions'
import ActiveSearchFilters from '@/components/discovery/result/ActiveSearchFilters'
import PlaceDetailView from '@/components/discovery/result/details/PlaceDetailView'
import EmptyState from '@/components/discovery/result/EmptyState'
import LoadingState from '@/components/discovery/result/LoadingState'
import PlaceMap from '@/components/discovery/result/Map'
import PlaceResultsGrid from '@/components/discovery/result/PlaceResultsGrid'
import ResultsHeader from '@/components/discovery/result/ResultsHeader'
import { PlaceResultItem } from '@/types/result.types'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DiscoveryResultProps } from './DiscoveryResult'

export default function DesktopDiscoveryResult({
  placeResults,
  title,
  subtitle,
  onSearchClick,
  baseLocation,
  showSaveButton = true,
  emptyStateMessage = 'No trips to display',
  isLoadingNew = false,
  isLoadingHistory = false,
  className = '',
  onSavePlace,
  hasMoreResults = false,
  isLoadingMore = false,
  onLoadMore,
  onNewSearch,
  onCardClick,
  searchQuery,
  generatedTitle,
  onEditFilters,
  onTitleEdit,
}: DiscoveryResultProps) {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [savedPlaceNames, setSavedPlaceNames] = useState<Set<string>>(new Set())
  const [selectedPlace, setSelectedPlace] = useState<PlaceResultItem | null>(
    null
  )

  // Handle marker clicks from the map
  const handleMarkerClick = useCallback(
    (index: number, place: PlaceResultItem) => {
      setActiveCardIndex(index)
      setSelectedPlace(place)
    },
    []
  )

  // Handle popup close from the map
  const handlePopupClose = () => {
    setActiveCardIndex(-1)
    setSelectedPlace(null)
  }

  // Handle card clicks to open detail view
  const handleCardClick = (index: number, place: PlaceResultItem) => {
    // Always set state - let React handle optimization
    setActiveCardIndex(index)
    setSelectedPlace(place)

    // Always call onCardClick to ensure map updates
    if (onCardClick) {
      onCardClick(index)
    }

    // Add to browser history for back button support
    window.history.pushState(
      { detailView: true, index, placeName: place.name },
      '',
      window.location.href
    )
  }

  // Handle back to cards view (from UI button)
  const handleBackToCards = () => {
    setSelectedPlace(null)
    setActiveCardIndex(-1)
    if (onCardClick) {
      onCardClick(-1)
    }

    // Replace current history entry instead of going back
    // This removes the detail view entry without triggering popstate
    window.history.replaceState(null, '', window.location.href)
  }

  // Load saved trips on component mount
  useEffect(() => {
    const loadSavedTrips = async () => {
      try {
        const result = await getSavedPlacesAction()
        if (result.success && result.data) {
          const savedNames = new Set(result.data.map((place) => place.name))
          setSavedPlaceNames(savedNames)
        }
      } catch (error) {
        console.error('Failed to load saved trips:', error)
      }
    }

    loadSavedTrips()
  }, [])

  // Handle browser back button
  useEffect(() => {
    const handlePopstate = () => {
      // Only handle if we're in detail view and this is a real back navigation
      if (selectedPlace) {
        setSelectedPlace(null)
        setActiveCardIndex(-1)
        if (onCardClick) {
          onCardClick(-1)
        }
      }
    }

    window.addEventListener('popstate', handlePopstate)

    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [selectedPlace, onCardClick])

  // Save place handler
  const handleSavePlace = async (place: PlaceResultItem) => {
    if (!showSaveButton) return

    setIsSaving(true)

    if (onSavePlace) {
      // Use the provided save function if available
      await onSavePlace(place)
      // Add to saved places set after successful save
      setSavedPlaceNames((prev) => new Set(prev).add(place.name))
    } else {
      // Default save logic
      toast.info(`Saving "${place.name}"...`)

      const placeToSave = {
        name: place.name,
        description: place.description,
        lat: place.lat,
        long: place.long,
        landscape: place.landscape,
        activity: place.activity,
        estimatedActivityDuration: place.estimatedActivityDuration,
        estimatedTransportTime: place.estimatedTransportTime,
        starRating: place.starRating,
        bestTimeToVisit: place.bestTimeToVisit,
        timeToAvoid: place.timeToAvoid,
        googleMapsLink: place.googleMapsLink,
        operatingHours: place.operatingHours,
        entranceFee: place.entranceFee,
        parkingInfo: place.parkingInfo,
        currentConditions: place.currentConditions,
      }

      const result = await savePlaceAction(placeToSave)

      if (result.success) {
        toast.success(`"${place.name}" saved successfully!`)
        // Add to saved places set after successful save
        setSavedPlaceNames((prev) => new Set(prev).add(place.name))
      } else {
        toast.error(result.error || 'Failed to save trip. Please try again.')
      }
    }

    setIsSaving(false)
  }

  if (isLoadingHistory) {
    return (
      <div className="ml-[60px] flex h-[100dvh]">
        <div className="flex h-full w-full flex-col px-6 md:w-1/2">
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Loader2 className="text-primary mx-auto mb-4 h-8 w-8 animate-spin" />
            </div>
          </div>
        </div>
        <div className="bg-muted h-[100dvh] w-full md:w-1/2">
          {/* Empty map area during loading */}
        </div>
      </div>
    )
  }

  return (
    <div className={`ml-[60px] flex h-[100dvh] ${className}`}>
      {/* Left Column - Conditional View */}
      <div className="flex h-full w-full flex-col md:w-1/2">
        <AnimatePresence mode="wait">
          {selectedPlace ? (
            /* Detail View */
            <PlaceDetailView
              key="detail-view"
              place={selectedPlace}
              onBack={handleBackToCards}
              onSave={handleSavePlace}
              isSaved={savedPlaceNames.has(selectedPlace.name)}
              showSaveButton={showSaveButton}
            />
          ) : (
            /* Cards List View */
            <motion.div
              key="cards-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex h-full flex-col px-6"
            >
              {/* Fixed Title Header with smooth transition */}
              <motion.div
                key={
                  generatedTitle ||
                  (searchQuery ? 'search-in-progress' : 'default')
                }
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <ResultsHeader
                  title={
                    searchQuery ? generatedTitle || 'Search in Progress' : title
                  }
                  subtitle={
                    searchQuery
                      ? 'Refine your search by editing filters or view your results below'
                      : subtitle
                  }
                  onNewSearch={onNewSearch}
                  isGeneratedTitle={!!generatedTitle}
                  onTitleEdit={onTitleEdit}
                />
              </motion.div>

              {/* Active Search Filters */}
              {searchQuery && (
                <ActiveSearchFilters
                  searchQuery={searchQuery}
                  onEditFilters={onEditFilters}
                />
              )}

              {/* Scrollable Content */}
              <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-1 overflow-y-auto px-1 py-4 pb-8">
                {/* Loading State */}
                {isLoadingNew && <LoadingState />}

                {/* No Results */}
                {!isLoadingNew &&
                  (!placeResults || placeResults.length === 0) && (
                    <EmptyState
                      message={emptyStateMessage}
                      onSearchClick={onSearchClick}
                    />
                  )}

                {/* Trip Results Grid */}
                {!isLoadingNew && placeResults && placeResults.length > 0 && (
                  <PlaceResultsGrid
                    placeResults={placeResults}
                    activeCardIndex={activeCardIndex}
                    savedPlaceNames={savedPlaceNames}
                    showSaveButton={showSaveButton}
                    isSaving={isSaving}
                    hasMoreResults={hasMoreResults}
                    isLoadingMore={isLoadingMore}
                    onLoadMore={onLoadMore}
                    onCardClick={handleCardClick}
                    onSavePlace={handleSavePlace}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Column - Map (Full Screen Height) */}
      <div className="h-[100dvh] w-full md:w-1/2">
        <PlaceMap
          key={`${baseLocation?.latitude}-${baseLocation?.longitude}`}
          placeResults={placeResults}
          baseLocation={baseLocation}
          activeMarkerIndex={activeCardIndex}
          activePlace={selectedPlace}
          className="h-full"
          onMarkerClick={handleMarkerClick}
          onPopupClose={handlePopupClose}
        />
      </div>
    </div>
  )
}
