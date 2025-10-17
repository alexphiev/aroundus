'use client'

import { getSavedPlacesAction } from '@/actions/place.actions'
import EmptyState from '@/components/discovery/result/EmptyState'
import LoadingState from '@/components/discovery/result/LoadingState'
import PlaceMap from '@/components/discovery/result/Map'
import MapToggleButton from '@/components/discovery/result/MapToggleButton'
import PlaceResultsGrid from '@/components/discovery/result/PlaceResultsGrid'
import SearchPlaceDetailView from '@/components/search/result/details/SearchPlaceDetailView'
import { Button } from '@/components/ui/button'
import { PlaceResultItem } from '@/types/result.types'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SearchResultProps } from './SearchResult'

export default function MobileSearchResult({
  placeResults,
  baseLocation,
  showSaveButton = true,
  emptyStateMessage = 'No places to display',
  isLoadingNew = false,
  className = '',
  onSavePlace,
  onNewSearch,
  onCardClick,
  showMapOnly = false,
  userLocation,
}: SearchResultProps) {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [savedPlaceNames, setSavedPlaceNames] = useState<Set<string>>(new Set())
  const [selectedPlace, setSelectedPlace] = useState<PlaceResultItem | null>(
    null
  )
  const [visibleView, setVisibleView] = useState<'map' | 'grid'>('map')
  const [navigationContext, setNavigationContext] = useState<'map' | 'grid'>(
    'map'
  )

  const activePlace = useMemo(() => {
    return activeCardIndex >= 0 && placeResults
      ? placeResults[activeCardIndex]
      : null
  }, [activeCardIndex, placeResults])

  useEffect(() => {
    if (!selectedPlace && isLoadingNew) {
      setVisibleView('grid')
    }
  }, [isLoadingNew, selectedPlace])

  const handleMarkerClick = (index: number) => {
    setActiveCardIndex(index)
  }

  const handlePopupClose = () => {
    setActiveCardIndex(-1)
    setSelectedPlace(null)
  }

  const handleCardClick = (index: number, place: PlaceResultItem) => {
    setActiveCardIndex(index)
    setSelectedPlace(place)
    setNavigationContext('grid')

    if (onCardClick) {
      onCardClick(index)
    }

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

  const handlePlaceDetailsFromMap = (index: number, place: PlaceResultItem) => {
    setActiveCardIndex(index)
    setSelectedPlace(place)
    setNavigationContext('map')

    if (onCardClick) {
      onCardClick(index)
    }

    const url = new URL(window.location.href)
    url.searchParams.set('place', index.toString())
    url.searchParams.set('placeName', place.name)
    url.searchParams.set('from', 'map')

    window.history.pushState(
      { detailView: true, index, placeName: place.name, from: 'map' },
      '',
      url.toString()
    )
  }

  const handleBackToCards = () => {
    setSelectedPlace(null)

    if (navigationContext === 'grid') {
      setVisibleView('grid')
      setActiveCardIndex(-1)
      if (onCardClick) {
        onCardClick(-1)
      }
    } else {
      setVisibleView('map')
    }

    const url = new URL(window.location.href)
    url.searchParams.delete('place')
    url.searchParams.delete('placeName')
    url.searchParams.delete('from')

    window.history.replaceState(null, '', url.toString())
  }

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

  useEffect(() => {
    const handlePopstate = () => {
      if (selectedPlace) {
        setSelectedPlace(null)

        if (navigationContext === 'grid') {
          setVisibleView('grid')
          setActiveCardIndex(-1)
          if (onCardClick) {
            onCardClick(-1)
          }
        } else {
          setVisibleView('map')
        }
      }
    }

    window.addEventListener('popstate', handlePopstate)

    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [selectedPlace, navigationContext, onCardClick])

  const handleSavePlace = async (place: PlaceResultItem) => {
    if (!showSaveButton) {
      return
    }

    setIsSaving(true)

    if (onSavePlace) {
      await onSavePlace(place)
      setSavedPlaceNames((prev) => new Set(prev).add(place.name))
    }

    setIsSaving(false)
  }

  if (showMapOnly) {
    return (
      <div className={`relative h-[100dvh] ${className}`}>
        <div className="absolute top-4 left-4 z-10">
          <Button
            onClick={onNewSearch}
            variant="default"
            size="lg"
            className="shadow-lg"
          >
            <Search className="mr-2 h-4 w-4" />
            New Search
          </Button>
        </div>

        <PlaceMap
          placeResults={null}
          baseLocation={userLocation || { latitude: 46.603354, longitude: 1.888334 }}
          activeMarkerIndex={-1}
          activePlace={null}
          className="h-full"
          onMarkerClick={handleMarkerClick}
          onPopupClose={handlePopupClose}
        />
      </div>
    )
  }

  return (
    <div className={`relative h-[100dvh] ${className}`}>
      <AnimatePresence mode="wait">
        {selectedPlace ? (
          <SearchPlaceDetailView
            key="detail-view"
            place={selectedPlace}
            onBack={handleBackToCards}
            onSave={handleSavePlace}
            isSaved={savedPlaceNames.has(selectedPlace.name)}
            showSaveButton={showSaveButton}
          />
        ) : (
          <>
            <motion.div
              key="map-view"
              initial={false}
              animate={{
                opacity: visibleView === 'map' ? 1 : 0,
                pointerEvents: visibleView === 'map' ? 'auto' : 'none',
              }}
              className="absolute inset-0"
            >
              <PlaceMap
                placeResults={placeResults}
                baseLocation={baseLocation}
                activeMarkerIndex={activeCardIndex}
                activePlace={activePlace}
                className="h-full"
                onMarkerClick={handleMarkerClick}
                onPopupClose={handlePopupClose}
                onPlaceDetailsClick={handlePlaceDetailsFromMap}
              />

              <div className="absolute top-4 left-4">
                <Button
                  onClick={onNewSearch}
                  variant="default"
                  size="sm"
                  className="shadow-lg"
                >
                  <Search className="mr-2 h-4 w-4" />
                  New Search
                </Button>
              </div>
            </motion.div>

            <motion.div
              key="grid-view"
              initial={false}
              animate={{
                opacity: visibleView === 'grid' ? 1 : 0,
                pointerEvents: visibleView === 'grid' ? 'auto' : 'none',
              }}
              className="absolute inset-0 flex flex-col bg-background"
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h1 className="text-lg font-bold">Search Results</h1>
                {onNewSearch && (
                  <Button onClick={onNewSearch} variant="outline" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-1 overflow-y-auto px-4 py-4">
                {isLoadingNew && <LoadingState />}

                {!isLoadingNew &&
                  (!placeResults || placeResults.length === 0) && (
                    <EmptyState message={emptyStateMessage} />
                  )}

                {!isLoadingNew && placeResults && placeResults.length > 0 && (
                  <PlaceResultsGrid
                    placeResults={placeResults}
                    activeCardIndex={activeCardIndex}
                    savedPlaceNames={savedPlaceNames}
                    showSaveButton={showSaveButton}
                    isSaving={isSaving}
                    hasMoreResults={false}
                    isLoadingMore={false}
                    onCardClick={handleCardClick}
                    onSavePlace={handleSavePlace}
                  />
                )}
              </div>
            </motion.div>

            <MapToggleButton
              onClick={() => setVisibleView(visibleView === 'map' ? 'grid' : 'map')}
              showingMap={visibleView === 'map'}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
