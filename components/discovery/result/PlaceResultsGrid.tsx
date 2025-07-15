'use client'

import { Button } from '@/components/ui/button'
import { PlaceResultItem } from '@/types/result.types'
import { Plus } from 'lucide-react'
import LoadingState from './LoadingState'
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
    <div className="space-y-6 py-20">
      <div
        className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
      >
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
      </div>

      {/* Load More Button */}
      {hasMoreResults && onLoadMore && !isLoadingMore && (
        <div className="flex justify-center">
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            size="lg"
            className="min-w-32"
          >
            <Plus className="mr-2 h-4 w-4" />
            Load More
          </Button>
        </div>
      )}
      {isLoadingMore && <LoadingState />}
    </div>
  )
}
