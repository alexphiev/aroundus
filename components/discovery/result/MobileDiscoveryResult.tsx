'use client'

import { getSavedPlacesAction, savePlaceAction } from '@/actions/place.actions'
import PlaceDetailView from '@/components/discovery/result/details/PlaceDetailView'
import DetailViewTopBar from '@/components/discovery/result/DetailViewTopBar'
import EmptyState from '@/components/discovery/result/EmptyState'
import LoadingState from '@/components/discovery/result/LoadingState'
import PlaceMap from '@/components/discovery/result/Map'
import MapToggleButton from '@/components/discovery/result/MapToggleButton'
import MobileTopBar from '@/components/discovery/result/MobileTopBar'
import PlaceResultsGrid from '@/components/discovery/result/PlaceResulstGrid'
import { PlaceResultItem } from '@/types/result.types'
import { AnimatePresence, motion, PanInfo } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DiscoveryResultProps } from './DiscoveryResult'

// Overlay states - simplified to two states
type OverlayState = 'collapsed' | 'full'

export default function MobileDiscoveryResult({
  placeResults,
  onSearchClick,
  userLocation,
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
}: DiscoveryResultProps) {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [savedPlaceNames, setSavedPlaceNames] = useState<Set<string>>(new Set())
  const [selectedPlace, setSelectedPlace] = useState<PlaceResultItem | null>(
    null
  )
  const [overlayState, setOverlayState] = useState<OverlayState>('collapsed')

  // Initialize overlay state based on content
  useEffect(() => {
    // Only show loading state in full view, otherwise stay collapsed to show map
    if (!selectedPlace && isLoadingNew) {
      setOverlayState('full')
    }
  }, [isLoadingNew, selectedPlace])

  // No animation needed with new layout approach

  // Handle drag end to determine new state - simplified for two states
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info
      const dragThreshold = 100 // Threshold for drag distance
      const velocityThreshold = 200 // Threshold for swipe velocity

      let newState: OverlayState = overlayState

      // Prioritize velocity over distance for more responsive feel
      const isSwipingUp =
        velocity.y < -velocityThreshold || offset.y < -dragThreshold
      const isSwipingDown =
        velocity.y > velocityThreshold || offset.y > dragThreshold

      if (isSwipingUp && overlayState === 'collapsed') {
        newState = 'full'
      } else if (isSwipingDown && overlayState === 'full') {
        newState = 'collapsed'
      }

      setOverlayState(newState)
    },
    [overlayState]
  )

  // Handle tap on drag handle
  const handleHandleTap = () => {
    if (overlayState === 'collapsed') {
      setOverlayState('full')
    } else {
      setOverlayState('collapsed')
    }
  }

  // Handle marker clicks from the map
  const handleMarkerClick = (index: number) => {
    setActiveCardIndex(index)
    if (onCardClick) {
      onCardClick(index)
    }
  }

  // Handle popup close from the map
  const handlePopupClose = () => {
    setActiveCardIndex(-1)
    if (onCardClick) {
      onCardClick(-1)
    }
  }

  // Handle card clicks to open detail view
  const handleCardClick = (index: number, place: PlaceResultItem) => {
    setActiveCardIndex(index)
    setSelectedPlace(place)

    if (onCardClick) {
      onCardClick(index)
    }

    // Add URL parameter for place details
    const url = new URL(window.location.href)
    url.searchParams.set('place', index.toString())
    url.searchParams.set('placeName', place.name)

    window.history.pushState(
      { detailView: true, index, placeName: place.name },
      '',
      url.toString()
    )
  }

  // Handle back to cards view
  const handleBackToCards = () => {
    setSelectedPlace(null)
    setActiveCardIndex(-1)
    if (onCardClick) {
      onCardClick(-1)
    }

    // Remove URL parameters when going back to cards view
    const url = new URL(window.location.href)
    url.searchParams.delete('place')
    url.searchParams.delete('placeName')

    window.history.replaceState(null, '', url.toString())
  }

  // Load saved trips
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

  // Handle URL parameters on mount to restore place details view
  useEffect(() => {
    if (placeResults && placeResults.length > 0) {
      const urlParams = new URLSearchParams(window.location.search)
      const placeIndex = urlParams.get('place')
      const placeName = urlParams.get('placeName')

      if (placeIndex && placeName) {
        const index = parseInt(placeIndex, 10)
        if (index >= 0 && index < placeResults.length) {
          const place = placeResults[index]
          // Verify the place name matches to ensure URL integrity
          if (place.name === placeName) {
            setActiveCardIndex(index)
            setSelectedPlace(place)
            if (onCardClick) {
              onCardClick(index)
            }
          }
        }
      }
    }
  }, [placeResults, onCardClick])

  // Handle browser back button
  useEffect(() => {
    const handlePopstate = () => {
      // Check if we're still on a place detail URL
      const urlParams = new URLSearchParams(window.location.search)
      const placeIndex = urlParams.get('place')

      if (!placeIndex && selectedPlace) {
        // URL doesn't have place parameter, so close detail view
        setSelectedPlace(null)
        setActiveCardIndex(-1)
        if (onCardClick) {
          onCardClick(-1)
        }
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [selectedPlace, onCardClick])

  // Save place handler
  const handleSavePlace = async (place: PlaceResultItem) => {
    if (!showSaveButton) return
    setIsSaving(true)

    if (onSavePlace) {
      await onSavePlace(place)
      setSavedPlaceNames((prev) => new Set(prev).add(place.name))
    } else {
      toast.info(`Saving "${place.name}"...`)
      const result = await savePlaceAction(place)
      if (result.success) {
        toast.success(`"${place.name}" saved successfully!`)
        setSavedPlaceNames((prev) => new Set(prev).add(place.name))
      } else {
        toast.error(result.error || 'Failed to save trip. Please try again.')
      }
    }
    setIsSaving(false)
  }

  const isFullScreen = overlayState === 'full'

  if (isLoadingHistory) {
    return (
      <div className="flex h-[100vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">
            Checking for previous searches...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex h-full flex-col overflow-hidden ${className}`}>
      {/* Fixed Top Bar */}
      <div className="flex-shrink-0">
        {selectedPlace ? (
          <DetailViewTopBar
            onBack={handleBackToCards}
            placeName={selectedPlace.name}
          />
        ) : (
          <MobileTopBar
            searchQuery={searchQuery}
            generatedTitle={generatedTitle}
            onEditFilters={onEditFilters}
            onNewSearch={onNewSearch}
          />
        )}
      </div>

      {/* Main Content Area - Strictly contained */}
      <div className="relative flex-1 overflow-hidden">
        {/* Background Map - Always show when not in detail view and not showing loading */}
        {!selectedPlace && !isLoadingNew && (
          <div className="absolute inset-0">
            <PlaceMap
              placeResults={placeResults}
              userLocation={userLocation}
              activeMarkerIndex={activeCardIndex}
              className="h-full w-full"
              shouldUpdateBounds={true}
              isProgressiveSearch={isLoadingMore}
              onMarkerClick={handleMarkerClick}
              onPopupClose={handlePopupClose}
            />
          </div>
        )}

        {/* Results indicator when map is showing */}
        {!selectedPlace &&
          overlayState === 'collapsed' &&
          placeResults &&
          placeResults.length > 0 && (
            <div
              className="bg-background/95 border-border/20 absolute right-4 bottom-4 left-4 z-40 cursor-pointer rounded-xl border p-3 shadow-lg backdrop-blur-sm"
              onClick={() => setOverlayState('full')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary h-2 w-2 rounded-full" />
                  <span className="text-foreground text-sm font-medium">
                    {placeResults.length} place
                    {placeResults.length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">
                  Tap to view
                </span>
              </div>
            </div>
          )}

        {/* Map Toggle Button - Only show when cards are full screen */}
        {isFullScreen && !selectedPlace && (
          <MapToggleButton onClick={() => setOverlayState('collapsed')} />
        )}

        {/* Content Overlay */}
        <AnimatePresence mode="wait">
          {selectedPlace ? (
            /* Detail View - Full Screen within container */
            <div className="bg-background absolute inset-0 z-50">
              <PlaceDetailView
                key="detail-view"
                place={selectedPlace}
                onBack={handleBackToCards}
                onSave={handleSavePlace}
                isSaved={savedPlaceNames.has(selectedPlace.name)}
                showSaveButton={showSaveButton}
              />
            </div>
          ) : overlayState === 'full' ? (
            /* Swipeable Cards Overlay - Only render when in full state */
            <motion.div
              key="cards-overlay"
              className={`bg-background absolute inset-0 z-30 ${
                isFullScreen
                  ? 'shadow-none'
                  : 'border-border/10 rounded-t-xl border-t shadow-2xl'
              }`}
              style={{
                touchAction: 'none',
              }}
              initial={{ y: 0 }}
              animate={{ y: 0 }}
              drag="y"
              dragConstraints={{
                top: -50,
                bottom: 50,
              }}
              dragElastic={0.05}
              onDragEnd={handleDragEnd}
            >
              {/* Drag Handle - Always visible for swipe indication */}
              <div
                className="bg-background/95 border-border/10 sticky top-0 z-40 flex cursor-pointer items-center justify-center border-b py-3 backdrop-blur-md select-none"
                onClick={handleHandleTap}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-muted-foreground/50 h-1.5 w-12 rounded-full" />
                  <span className="text-muted-foreground/70 mt-1 text-xs">
                    Swipe to toggle
                  </span>
                </div>
              </div>

              {/* Content Area - Properly contained */}
              <div className="flex h-full flex-col overflow-hidden">
                <motion.div
                  className="flex h-full flex-col px-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Scrollable Content - with proper bottom spacing */}
                  <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-1 overflow-y-auto py-4 pb-8">
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

                    {/* Trip Results Grid - Mobile Optimized */}
                    {!isLoadingNew &&
                      placeResults &&
                      placeResults.length > 0 && (
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
                          isMobile={true}
                        />
                      )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
