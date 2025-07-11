'use client'

import { getSavedPlacesAction, savePlaceAction } from '@/actions/place.actions'
import DetailViewTopBar from '@/components/discovery/result/DetailViewTopBar'
import EmptyState from '@/components/discovery/result/EmptyState'
import FloatingActionButton from '@/components/discovery/result/FloatingActionButton'
import LoadingState from '@/components/discovery/result/LoadingState'
import PlaceMap from '@/components/discovery/result/Map'
import MapToggleButton from '@/components/discovery/result/MapToggleButton'
import MobileTopBar from '@/components/discovery/result/MobileTopBar'
import PlaceDetailView from '@/components/discovery/result/PlaceDetailView'
import PlaceResultsGrid from '@/components/discovery/result/PlaceResulstGrid'
import { PlaceResultItem } from '@/types/result.types'
import { FormValues } from '@/types/search-history.types'
import { AnimatePresence, motion, PanInfo, useAnimation } from 'framer-motion'
import { ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

// Overlay states
type OverlayState = 'collapsed' | 'half' | 'full'

interface Props {
  placeResults: PlaceResultItem[] | null
  onSearchClick?: () => void
  userLocation?: { latitude: number; longitude: number } | null
  showSaveButton?: boolean
  emptyStateMessage?: string
  isLoading?: boolean
  className?: string
  onSavePlace?: (place: PlaceResultItem) => Promise<void>
  hasMoreResults?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  onNewSearch?: () => void
  onCardClick?: (index: number) => void
  searchQuery?: FormValues | null
  generatedTitle?: string | null
  onEditFilters?: () => void
}

// State configuration - adjusted for top bar and bottom nav
const stateConfig = {
  collapsed: { heightPercent: 20, y: 'calc(100vh - 140px)' }, // Always visible above bottom nav (80px) + handle (60px)
  half: { heightPercent: 50, y: '50%' },
  full: { heightPercent: 100, y: '64px' }, // Start below top bar (64px = 4rem)
}

export default function MobileDiscoveryResult({
  placeResults,
  onSearchClick,
  userLocation,
  showSaveButton = true,
  emptyStateMessage = 'No trips to display',
  isLoading = false,
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
}: Props) {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [savedPlaceNames, setSavedPlaceNames] = useState<Set<string>>(new Set())
  const [selectedPlace, setSelectedPlace] = useState<PlaceResultItem | null>(
    null
  )
  const [overlayState, setOverlayState] = useState<OverlayState>('collapsed')
  const controls = useAnimation()

  // Initialize overlay state based on content
  useEffect(() => {
    if (placeResults && placeResults.length > 0) {
      setOverlayState('half')
    } else if (isLoading) {
      setOverlayState('half')
    } else {
      setOverlayState('collapsed')
    }
  }, [placeResults, isLoading])

  // Animate to current state
  useEffect(() => {
    const config = stateConfig[overlayState]
    const yValue = overlayState === 'full' ? 0 : config.y

    controls.start({
      y: yValue,
      transition: {
        type: 'spring',
        damping: 30,
        stiffness: 300,
        duration: 0.3,
      },
    })
  }, [overlayState, controls])

  // Handle drag end to determine new state - more responsive snapping
  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info
      const screenHeight = window.innerHeight
      const dragThreshold = screenHeight * 0.1 // Smaller threshold for more responsive snapping
      const velocityThreshold = 200 // Lower threshold for easier triggering

      let newState: OverlayState = overlayState

      // Prioritize velocity over distance for more responsive feel
      const isSwipingUp =
        velocity.y < -velocityThreshold || offset.y < -dragThreshold
      const isSwipingDown =
        velocity.y > velocityThreshold || offset.y > dragThreshold

      if (isSwipingUp) {
        if (overlayState === 'collapsed') newState = 'half'
        else if (overlayState === 'half') newState = 'full'
      } else if (isSwipingDown) {
        if (overlayState === 'full') newState = 'half'
        else if (overlayState === 'half') newState = 'collapsed'
      }

      setOverlayState(newState)
    },
    [overlayState]
  )

  // Handle tap on drag handle
  const handleHandleTap = () => {
    if (overlayState === 'collapsed') {
      setOverlayState('half')
    } else if (overlayState === 'half') {
      setOverlayState('full')
    } else {
      setOverlayState('half')
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

    window.history.pushState(
      { detailView: true, index, placeName: place.name },
      '',
      window.location.href
    )
  }

  // Handle back to cards view
  const handleBackToCards = () => {
    setSelectedPlace(null)
    setActiveCardIndex(-1)
    if (onCardClick) {
      onCardClick(-1)
    }
    window.history.replaceState(null, '', window.location.href)
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

  // Handle browser back button
  useEffect(() => {
    const handlePopstate = () => {
      if (selectedPlace) {
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

  const showContent = overlayState !== 'collapsed'
  const isCollapsed = overlayState === 'collapsed'
  const isFullScreen = overlayState === 'full'

  return (
    <div className={`relative h-screen overflow-hidden ${className}`}>
      {/* Conditional Top Bar */}
      {selectedPlace ? (
        <DetailViewTopBar
          onBack={handleBackToCards}
          placeName={selectedPlace.name}
        />
      ) : (
        <MobileTopBar
          searchQuery={searchQuery}
          generatedTitle={generatedTitle}
          resultsCount={placeResults?.length || 0}
          onEditFilters={onEditFilters}
        />
      )}

      {/* Full-screen background map - Only show when not in detail view */}
      {!selectedPlace && (
        <div className="absolute inset-0 pt-16">
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

      {/* Floating Action Button - Only show when not full screen and not in detail view */}
      {!selectedPlace && (
        <FloatingActionButton onClick={() => onNewSearch?.()} />
      )}

      {/* Map Toggle Button - Only show when full screen and not in detail view */}
      {isFullScreen && !selectedPlace && (
        <MapToggleButton onClick={() => setOverlayState('collapsed')} />
      )}

      {/* Overlay content */}
      <AnimatePresence mode="wait">
        {selectedPlace ? (
          /* Detail View - Full Screen */
          <div className="absolute inset-0 z-50 bg-background pb-16">
            <PlaceDetailView
              key="detail-view"
              place={selectedPlace}
              onBack={handleBackToCards}
              onSave={handleSavePlace}
              isSaved={savedPlaceNames.has(selectedPlace.name)}
              showSaveButton={showSaveButton}
            />
          </div>
        ) : (
          /* Swipeable Cards Overlay */
          <motion.div
            key="cards-overlay"
            className={`absolute inset-x-0 z-30 bg-background shadow-2xl border-t border-border/10 ${
              isFullScreen ? 'top-16 rounded-none' : 'bottom-0 rounded-t-xl'
            }`}
            style={{
              height: isFullScreen ? 'calc(100vh - 4rem)' : '100vh',
              touchAction: 'none',
            }}
            initial={{ y: isFullScreen ? 0 : 'calc(100vh - 140px)' }}
            animate={controls}
            drag="y"
            dragConstraints={{
              top: isFullScreen ? -50 : -window.innerHeight * 0.4, // Reduced range for cleaner snapping
              bottom: 120, // Never go below 120px from bottom (ensures always visible above bottom nav)
            }}
            dragElastic={0.05} // Reduced elasticity for snappier feel
            onDragEnd={handleDragEnd}
            whileTap={{ scale: isCollapsed ? 1.01 : 1 }} // Subtle feedback
          >
            {/* Drag Handle - Only show when not overlapping with top bar */}
            {!isFullScreen && (
              <div
                className="relative flex items-center justify-center py-4 cursor-pointer select-none bg-background border-b border-border/5"
                onClick={handleHandleTap}
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-12 h-1.5 rounded-full transition-colors ${
                      overlayState === 'collapsed'
                        ? 'bg-primary/50'
                        : 'bg-muted-foreground/30'
                    }`}
                  />
                  {isCollapsed && (
                    <ChevronUp className="h-4 w-4 text-primary/70 mt-1" />
                  )}
                </div>

                {/* Collapsed preview - improved layout */}
                {isCollapsed && placeResults && placeResults.length > 0 && (
                  <div className="absolute left-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm font-medium text-foreground">
                      {placeResults.length} place
                      {placeResults.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Full Screen Drag Handle - Always visible to indicate swipe capability */}
            {isFullScreen && (
              <div
                className="sticky top-0 z-40 flex items-center justify-center py-3 cursor-pointer select-none bg-background/95 backdrop-blur-md border-b border-border/10 shadow-sm"
                onClick={handleHandleTap}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-1.5 bg-muted-foreground/50 rounded-full" />
                  <span className="text-xs text-muted-foreground/70 mt-1">
                    Swipe down
                  </span>
                </div>
              </div>
            )}

            {/* Content Area - Simplified */}
            <div className="flex flex-col h-full pb-20 overflow-hidden">
              {showContent && (
                <motion.div
                  className="flex flex-col h-full px-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto py-4 pb-8 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {/* Loading State */}
                    {isLoading && <LoadingState />}

                    {/* No Results */}
                    {!isLoading &&
                      (!placeResults || placeResults.length === 0) && (
                        <EmptyState
                          message={emptyStateMessage}
                          onSearchClick={onSearchClick}
                        />
                      )}

                    {/* Trip Results Grid - Mobile Optimized */}
                    {!isLoading && placeResults && placeResults.length > 0 && (
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
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
