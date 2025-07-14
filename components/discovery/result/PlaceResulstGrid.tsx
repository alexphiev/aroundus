'use client'

import { Button } from '@/components/ui/button'
import { PlaceResultItem } from '@/types/result.types'
import { AnimatePresence } from 'framer-motion'
import { Loader2, Plus } from 'lucide-react'
import PlaceCard from './PlaceCard'

interface Props {
  placeResults: PlaceResultItem[]
  activeCardIndex: number
  savedPlaceNames: Set<string>
  showSaveButton: boolean
  isSaving: boolean
  hasMoreResults: boolean
  isLoadingMore: boolean
  onLoadMore?: () => void
  onCardClick: (index: number, place: PlaceResultItem) => void
  onSavePlace: (place: PlaceResultItem) => void
  isMobile?: boolean
}

export default function PlaceResultsGrid({
  placeResults,
  activeCardIndex,
  savedPlaceNames,
  showSaveButton,
  isSaving,
  hasMoreResults,
  isLoadingMore,
  onLoadMore,
  onCardClick,
  onSavePlace,
  isMobile = false,
}: Props) {
  return (
    <div className="space-y-6">
      <div
        className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
      >
        <AnimatePresence>
          {placeResults.map((place, index) => (
            <PlaceCard
              key={place.id || index}
              place={place}
              index={index}
              isActive={activeCardIndex === index}
              isSaved={savedPlaceNames.has(place.name)}
              showSaveButton={showSaveButton}
              isSaving={isSaving}
              onClick={() => onCardClick(index, place)}
              onSave={(e) => {
                e.stopPropagation()
                onSavePlace(place)
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Load More Button */}
      {hasMoreResults && onLoadMore && (
        <div className="flex justify-center">
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            size="lg"
            className="min-w-32"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Load More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
