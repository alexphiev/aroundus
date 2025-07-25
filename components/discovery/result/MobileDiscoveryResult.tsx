'use client'

import { getSavedPlacesAction, savePlaceAction } from '@/actions/place.actions'
import PlaceDetailView from '@/components/discovery/result/details/PlaceDetailView'
import EmptyState from '@/components/discovery/result/EmptyState'
import LoadingState from '@/components/discovery/result/LoadingState'
import PlaceMap from '@/components/discovery/result/Map'
import MapToggleButton from '@/components/discovery/result/MapToggleButton'
import MobileTopBar from '@/components/discovery/result/MobileTopBar'
import PlaceResultsGrid from '@/components/discovery/result/PlaceResultsGrid'
import { PlaceResultItem } from '@/types/result.types'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DiscoveryResultProps } from './DiscoveryResult'

export default function MobileDiscoveryResult({
  placeResults,
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
}: DiscoveryResultProps) {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [savedPlaceNames, setSavedPlaceNames] = useState<Set<string>>(new Set())
  const [selectedPlace, setSelectedPlace] = useState<PlaceResultItem | null>(
    null
  )
  const [visibleView, setVisibleView] = useState<'map' | 'grid'>('grid')
  const [navigationContext, setNavigationContext] = useState<'map' | 'grid'>(
    'map'
  )

  const activePlace = useMemo(() => {
    return activeCardIndex >= 0 && placeResults
      ? placeResults[activeCardIndex]
      : null
  }, [activeCardIndex, placeResults])

  // Initialize overlay state based on content
  useEffect(() => {
    // Only show loading state in full view, otherwise stay collapsed to show map
    if (!selectedPlace && isLoadingNew) {
      setVisibleView('grid')
    }
  }, [isLoadingNew, selectedPlace])

  // Handle marker clicks from the map - only show popup on mobile
  const handleMarkerClick = (index: number) => {
    setActiveCardIndex(index)
    // Don't set selectedPlace here - just show popup
    // selectedPlace will be set when user clicks "View Details" in popup
  }

  // Handle popup close from the map
  const handlePopupClose = () => {
    setActiveCardIndex(-1)
    setSelectedPlace(null)
  }

  // Handle card clicks to open detail view
  const handleCardClick = (index: number, place: PlaceResultItem) => {
    setActiveCardIndex(index)
    setSelectedPlace(place)
    setNavigationContext('grid') // Set context to grid when coming from cards

    if (onCardClick) {
      onCardClick(index)
    }

    // Add URL parameter for place details
    const url = new URL(window.location.href)
    url.searchParams.set('place', index.toString())
    url.searchParams.set('placeName', place.name)
    url.searchParams.set('from', 'grid') // Add context to URL

    window.history.pushState(
      { detailView: true, index, placeName: place.name, from: 'grid' },
      '',
      url.toString()
    )
  }

  // Handle place details click from map popup
  const handlePlaceDetailsFromMap = (index: number, place: PlaceResultItem) => {
    setActiveCardIndex(index)
    setSelectedPlace(place)
    setNavigationContext('map') // Set context to map when coming from map

    if (onCardClick) {
      onCardClick(index)
    }

    // Add URL parameter for place details
    const url = new URL(window.location.href)
    url.searchParams.set('place', index.toString())
    url.searchParams.set('placeName', place.name)
    url.searchParams.set('from', 'map') // Add context to URL

    window.history.pushState(
      { detailView: true, index, placeName: place.name, from: 'map' },
      '',
      url.toString()
    )
  }

  // Handle back to cards view
  const handleBackToCards = () => {
    setSelectedPlace(null)

    // Return to the appropriate view based on navigation context
    if (navigationContext === 'grid') {
      setVisibleView('grid') // Go back to grid view
      setActiveCardIndex(-1) // Clear active marker for grid view
      if (onCardClick) {
        onCardClick(-1)
      }
    } else {
      setVisibleView('map') // Go back to map view
      // Keep activeCardIndex for map view to maintain popup
    }

    // Remove URL parameters when going back to cards view
    const url = new URL(window.location.href)
    url.searchParams.delete('place')
    url.searchParams.delete('placeName')
    url.searchParams.delete('from')

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
      const fromContext = urlParams.get('from')

      if (placeIndex && placeName) {
        const index = parseInt(placeIndex, 10)
        if (index >= 0 && index < placeResults.length) {
          const place = placeResults[index]
          // Verify the place name matches to ensure URL integrity
          if (place.name === placeName) {
            setActiveCardIndex(index)
            setSelectedPlace(place)
            // Set navigation context based on URL parameter
            setNavigationContext(fromContext === 'map' ? 'map' : 'grid')
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

        // Only reset activeCardIndex if we're going back to grid view
        if (navigationContext === 'grid') {
          setActiveCardIndex(-1)
          if (onCardClick) {
            onCardClick(-1)
          }
        }
        // For map view, keep the activeCardIndex to maintain pin focus
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [selectedPlace, navigationContext, onCardClick])

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

  if (isLoadingHistory) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto mb-4 h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {/* Fixed Top Bar */}
      {!selectedPlace &&
        (navigationContext === 'grid' || navigationContext === 'map') && (
          <div className="h-20">
            <MobileTopBar
              searchQuery={searchQuery}
              generatedTitle={generatedTitle}
              onEditFilters={onEditFilters}
              onNewSearch={onNewSearch}
            />
          </div>
        )}

      {/* Main Content Area - Takes remaining space */}
      <div className="flex-1">
        {/* Background Map - Always show when not in detail view and not showing loading */}
        {!selectedPlace && !isLoadingNew && (
          <div className="inset-0 h-full">
            <PlaceMap
              key={`${baseLocation?.latitude}-${baseLocation?.longitude}`}
              placeResults={placeResults}
              baseLocation={baseLocation}
              activeMarkerIndex={activeCardIndex}
              activePlace={activePlace}
              className="h-full w-full"
              shouldUpdateBounds={true}
              isProgressiveSearch={isLoadingMore}
              onMarkerClick={handleMarkerClick}
              onPopupClose={handlePopupClose}
              onPlaceDetailsClick={handlePlaceDetailsFromMap}
            />
          </div>
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
          ) : visibleView === 'grid' ? (
            /* Cards Overlay - Only render when in grid state */
            <motion.div
              key="cards-overlay"
              className="bg-background absolute inset-0 z-30 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Scrollable Content - Takes full height with proper overflow */}
              <div className="mobile-scroll flex-1 overflow-y-auto p-4">
                {/* Loading State */}
                {isLoadingNew && <LoadingState />}

                {/* No Results */}
                {!isLoadingNew &&
                  (!placeResults || placeResults.length === 0) && (
                    <div className="pt-20">
                      <EmptyState message={emptyStateMessage} />
                    </div>
                  )}

                {/* Trip Results Grid - Mobile Optimized */}
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
                    isMobile={true}
                  />
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Map Toggle Button - Show in both states for easy switching */}
      {!selectedPlace && placeResults && placeResults.length > 0 && (
        <MapToggleButton
          onClick={() => setVisibleView(visibleView === 'map' ? 'grid' : 'map')}
          showingMap={visibleView === 'map'}
        />
      )}
    </div>
  )
}
