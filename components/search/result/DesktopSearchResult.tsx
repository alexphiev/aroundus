'use client'

import { getSavedPlacesAction } from '@/actions/place.actions'
import PlaceMap from '@/components/discovery/result/Map'
import EmptyState from '@/components/discovery/result/EmptyState'
import LoadingState from '@/components/discovery/result/LoadingState'
import PlaceResultsGrid from '@/components/discovery/result/PlaceResultsGrid'
import SearchPlaceDetailView from '@/components/search/result/details/SearchPlaceDetailView'
import { Button } from '@/components/ui/button'
import { PlaceResultItem } from '@/types/result.types'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SearchResultProps } from './SearchResult'

export default function DesktopSearchResult({
  placeResults,
  title,
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
  console.log('🖥️ DesktopSearchResult RENDER', {
    resultsCount: placeResults?.length,
    isLoadingNew,
    showMapOnly,
    hasBaseLocation: !!baseLocation,
    timestamp: Date.now(),
  })

  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [savedPlaceNames, setSavedPlaceNames] = useState<Set<string>>(new Set())
  const [selectedPlace, setSelectedPlace] = useState<PlaceResultItem | null>(
    null
  )

  const handleMarkerClick = useCallback(
    (index: number, place: PlaceResultItem) => {
      setActiveCardIndex(index)
      setSelectedPlace(place)
    },
    []
  )

  const handlePopupClose = () => {
    setActiveCardIndex(-1)
    setSelectedPlace(null)
  }

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

  const handleBackToCards = () => {
    setSelectedPlace(null)
    setActiveCardIndex(-1)
    if (onCardClick) {
      onCardClick(-1)
    }

    window.history.replaceState(null, '', window.location.href)
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
      <div className={`relative flex h-[100dvh] ${className}`}>
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

        <div className="h-[100dvh] w-full">
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
      </div>
    )
  }

  return (
    <div className={`ml-[60px] flex h-[100dvh] ${className}`}>
      <div className="flex h-full w-full flex-col md:w-1/2">
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
            <motion.div
              key="cards-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex h-full flex-col px-6"
            >
              <div className="flex items-center justify-between border-b py-4">
                <h1 className="text-2xl font-bold">{title}</h1>
                {onNewSearch && (
                  <Button onClick={onNewSearch} variant="outline" size="sm">
                    <Search className="mr-2 h-4 w-4" />
                    New Search
                  </Button>
                )}
              </div>

              <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-1 overflow-y-auto px-1 py-4 pb-8">
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
          )}
        </AnimatePresence>
      </div>

      <div className="h-[100dvh] w-full md:w-1/2">
        <PlaceMap
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
