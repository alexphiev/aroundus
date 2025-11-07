'use client'

import { PlacesInView } from '@/actions/explore.actions'
import EmptyState from '@/components/discovery/result/EmptyState'
import LoadingState from '@/components/discovery/result/LoadingState'
import PlaceResultsGrid from '@/components/search/result/PlaceResultsGrid'
import SearchPlaceDetailView from '@/components/search/result/details/SearchPlaceDetailView'
import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect } from 'react'

interface SearchResultsProps {
  places: PlacesInView[]
  isLoading: boolean
  onNewSearch: () => void
  hasFilters: boolean
  selectedPlace: PlacesInView | null
  activeCardIndex: number
  onPlaceSelect: (
    index: number,
    place: PlacesInView | null,
    shouldCenterMap?: boolean
  ) => void
  onPlaceHover: (place: PlacesInView | null) => void
}

export default function SearchResults({
  places,
  isLoading,
  onNewSearch,
  hasFilters,
  selectedPlace,
  activeCardIndex,
  onPlaceSelect,
  onPlaceHover,
}: SearchResultsProps) {
  const handleCardClick = (index: number, place: PlacesInView) => {
    onPlaceSelect(index, place, true) // true = should center map

    // Only push to history if we're not already in detail view
    // If we're switching between detail views (shouldn't happen from cards, but just in case)
    if (!selectedPlace) {
      window.history.pushState(
        { detailView: true, index, placeName: place.name },
        '',
        window.location.href
      )
    }
  }

  const handleBackToCards = () => {
    onPlaceSelect(-1, null, false)

    window.history.replaceState(null, '', window.location.href)
  }

  useEffect(() => {
    const handlePopstate = () => {
      if (selectedPlace) {
        onPlaceSelect(-1, null)
      }
    }

    window.addEventListener('popstate', handlePopstate)

    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [selectedPlace, onPlaceSelect])

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <AnimatePresence mode="wait">
        {selectedPlace ? (
          <SearchPlaceDetailView
            key="detail-view"
            place={selectedPlace}
            onBack={handleBackToCards}
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
            <div className="flex items-center justify-between gap-4 border-b py-4 pr-2">
              <h1 className="text-2xl font-bold">
                {hasFilters ? 'Filtered Results' : 'Explore Places'}
              </h1>
              <Button
                onClick={onNewSearch}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Search className="mr-2 h-4 w-4" />
                New Search
              </Button>
            </div>

            <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-1 overflow-y-auto px-1 py-4 pb-8">
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
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
