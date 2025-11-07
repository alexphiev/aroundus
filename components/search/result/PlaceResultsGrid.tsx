'use client'

import { PlacesInView } from '@/actions/explore.actions'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import LoadingState from '../../discovery/result/LoadingState'
import PlaceCard from './PlaceCard'

interface Props {
  placeResults: PlacesInView[]
  activeCardIndex: number
  hasMoreResults: boolean
  isLoadingMore: boolean
  onLoadMore?: () => void
  onCardClick: (index: number, place: PlacesInView) => void
  onCardHover?: (place: PlacesInView | null) => void
  isMobile?: boolean
}

export default function PlaceResultsGrid({
  placeResults,
  activeCardIndex,
  hasMoreResults,
  isLoadingMore,
  onLoadMore,
  onCardClick,
  onCardHover,
  isMobile = false,
}: Props) {
  return (
    <div className={`space-y-6 ${isMobile && 'py-20'}`}>
      <div
        className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
      >
        {placeResults.map((place, index) => (
          <PlaceCard
            key={place.id || index}
            place={place}
            index={index}
            isActive={activeCardIndex === index}
            onClick={() => onCardClick(index, place)}
            onMouseEnter={onCardHover ? () => onCardHover(place) : undefined}
            onMouseLeave={onCardHover ? () => onCardHover(null) : undefined}
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
