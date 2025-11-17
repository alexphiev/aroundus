'use client'

import { ParkWithGeometry } from '@/actions/search.actions'
import EmptyState from '@/components/discovery/result/EmptyState'
import LoadingState from '@/components/discovery/result/LoadingState'
import MapToggleButton from '@/components/discovery/result/MapToggleButton'
import { Button } from '@/components/ui/button'
import { SearchPlaceInView } from '@/types/search.types'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import SearchPlaceDetailView from './details/SearchPlaceDetailView'
import Map from './Map'
import MobileMapPreviewCard from './MobileMapPreviewCard'
import PlaceResultsGrid from './PlaceResultsGrid'

interface MobileSearchResultsProps {
  places: SearchPlaceInView[]
  parksWithGeometry: ParkWithGeometry[]
  isLoading: boolean
  onNewSearch: () => void
  hasFilters: boolean
  selectedPlace: SearchPlaceInView | null
  activeCardIndex: number
  onPlaceSelect: (
    index: number,
    place: SearchPlaceInView | null,
    shouldCenterMap?: boolean
  ) => void
  onPlaceHover: (place: SearchPlaceInView | null) => void
  onBoundsChange: (bounds: {
    north: number
    south: number
    east: number
    west: number
  }) => void
  onMapReady?: (
    centerMap: (lat: number, lng: number) => void,
    restoreView: () => void
  ) => void
}

export default function MobileSearchResults({
  places,
  parksWithGeometry,
  isLoading,
  onNewSearch,
  hasFilters,
  selectedPlace,
  activeCardIndex,
  onPlaceSelect,
  onPlaceHover,
  onBoundsChange,
  onMapReady,
}: MobileSearchResultsProps) {
  const [visibleView, setVisibleView] = useState<'map' | 'grid'>('map')
  const [navigationContext, setNavigationContext] = useState<'map' | 'grid'>(
    'map'
  )
  const [previewPlace, setPreviewPlace] = useState<SearchPlaceInView | null>(
    null
  )

  const activePlace =
    activeCardIndex >= 0 && places ? places[activeCardIndex] : null

  const handleMarkerClick = (index: number, place: SearchPlaceInView) => {
    // Only set the index for tracking, but don't set selectedPlace yet
    // This will show the preview card instead of the detail view
    onPlaceSelect(index, null, false)
    setNavigationContext('map')
    setPreviewPlace(place)
  }

  const handlePopupClose = () => {
    // Clear both the selected place and preview place
    onPlaceSelect(-1, null)
    setPreviewPlace(null)
  }

  const handlePreviewCardClick = () => {
    if (!previewPlace) {
      return
    }

    // Open the detail view and clear the preview card
    onPlaceSelect(activeCardIndex, previewPlace, false)
    setPreviewPlace(null)

    const url = new URL(window.location.href)
    url.searchParams.set('place', activeCardIndex.toString())
    url.searchParams.set('placeName', previewPlace.name)
    url.searchParams.set('from', 'map')

    window.history.pushState(
      {
        detailView: true,
        index: activeCardIndex,
        placeName: previewPlace.name,
        from: 'map',
      },
      '',
      url.toString()
    )
  }

  const handleCardClick = (index: number, place: SearchPlaceInView) => {
    onPlaceSelect(index, place, true)
    setNavigationContext('grid')

    const url = new URL(window.location.href)
    url.searchParams.set('place', index.toString())
    url.searchParams.set('placeName', place.name)
    url.searchParams.set('from', 'grid')

    window.history.pushState(
      { detailView: true, index, placeName: place.name, from: 'grid' },
      '',
      url.toString()
    )
  }

  const handleBackToCards = () => {
    if (navigationContext === 'grid') {
      setVisibleView('grid')
      onPlaceSelect(-1, null)
    } else {
      setVisibleView('map')
      onPlaceSelect(-1, null)
      setPreviewPlace(null)
    }

    const url = new URL(window.location.href)
    url.searchParams.delete('place')
    url.searchParams.delete('placeName')
    url.searchParams.delete('from')

    window.history.replaceState(null, '', url.toString())
  }

  useEffect(() => {
    if (places && places.length > 0) {
      const urlParams = new URLSearchParams(window.location.search)
      const placeIndex = urlParams.get('place')
      const placeName = urlParams.get('placeName')
      const fromContext = urlParams.get('from')

      if (placeIndex && placeName) {
        const index = parseInt(placeIndex, 10)
        if (index >= 0 && index < places.length) {
          const place = places[index]
          if (place.name === placeName) {
            onPlaceSelect(index, place)
            setNavigationContext(fromContext === 'map' ? 'map' : 'grid')
          }
        }
      }
    }
  }, [places, onPlaceSelect])

  useEffect(() => {
    const handlePopstate = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const placeIndex = urlParams.get('place')

      if (!placeIndex && selectedPlace) {
        if (navigationContext === 'grid') {
          onPlaceSelect(-1, null)
        } else {
          // Coming back from map context - clear both selected place and preview
          onPlaceSelect(-1, null)
          setPreviewPlace(null)
        }
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [selectedPlace, navigationContext, onPlaceSelect])

  // Clear preview card when switching away from map view
  useEffect(() => {
    if (visibleView === 'grid') {
      setPreviewPlace(null)
    }
  }, [visibleView])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <div className="inset-0 h-full">
          <Map
            places={places}
            parksWithGeometry={parksWithGeometry}
            onBoundsChange={onBoundsChange}
            activePlace={previewPlace || activePlace}
            onMarkerClick={handleMarkerClick}
            onPopupClose={handlePopupClose}
            onMapReady={onMapReady}
            hideZoomControls={true}
            disableHoverInteractions={true}
          />
        </div>

        {previewPlace && !selectedPlace && visibleView === 'map' && (
          <AnimatePresence>
            <MobileMapPreviewCard
              place={previewPlace}
              onClick={handlePreviewCardClick}
            />
          </AnimatePresence>
        )}

        <AnimatePresence mode="wait">
          {selectedPlace ? (
            <div className="bg-background absolute inset-0 z-50">
              <SearchPlaceDetailView
                key="detail-view"
                place={selectedPlace}
                onBack={handleBackToCards}
                showSaveButton={false}
              />
            </div>
          ) : visibleView === 'grid' ? (
            <motion.div
              key="cards-overlay"
              className="bg-background absolute inset-0 z-30 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-background/95 border-border/10 border-b p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-semibold">
                    {hasFilters ? 'Filtered Results' : 'Explore Places'}
                  </h1>
                  <Button
                    onClick={onNewSearch}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mobile-scroll flex-1 overflow-y-auto p-4">
                {isLoading && <LoadingState />}

                {!isLoading && places.length === 0 && (
                  <EmptyState
                    message={
                      hasFilters
                        ? 'No places found matching your filters'
                        : 'Move the map to explore places'
                    }
                  />
                )}

                {!isLoading && places.length > 0 && (
                  <PlaceResultsGrid
                    placeResults={places}
                    activeCardIndex={activeCardIndex}
                    hasMoreResults={false}
                    isLoadingMore={false}
                    onCardClick={handleCardClick}
                    onCardHover={onPlaceHover}
                    isMobile={true}
                  />
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {!selectedPlace && (
        <MapToggleButton
          onClick={() => {
            const newView = visibleView === 'map' ? 'grid' : 'map'
            setVisibleView(newView)
            // Clear preview card when switching to grid view
            if (newView === 'grid') {
              setPreviewPlace(null)
            }
          }}
          showingMap={visibleView === 'map'}
          isLoading={isLoading}
          hasPreviewCard={!!previewPlace && visibleView === 'map'}
        />
      )}
    </div>
  )
}
