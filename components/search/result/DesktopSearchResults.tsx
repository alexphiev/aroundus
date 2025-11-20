'use client'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { ParkWithGeometry } from '@/actions/search.actions'
import { SearchPlaceInView } from '@/types/search.types'
import Map from './Map'
import SearchResults from './SearchResults'
import SearchFiltersBar from './SearchFiltersBar'
import { SearchFilters } from '@/types/search.types'

interface DesktopSearchResultsProps {
  places: SearchPlaceInView[]
  parksWithGeometry: ParkWithGeometry[]
  isLoading: boolean
  onNewSearch: () => void
  hasFilters: boolean
  selectedPlace: SearchPlaceInView | null
  activeCardIndex: number
  hoveredPlace: SearchPlaceInView | null
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
  currentFilters: SearchFilters | null
  onEditFilters: () => void
  onClearFilters: () => void
  onMapReady?: (
    centerMap: (lat: number, lng: number) => void,
    restoreView: () => void
  ) => void
}

export default function DesktopSearchResults({
  places,
  parksWithGeometry,
  isLoading,
  onNewSearch,
  hasFilters,
  selectedPlace,
  activeCardIndex,
  hoveredPlace,
  onPlaceSelect,
  onPlaceHover,
  onBoundsChange,
  currentFilters,
  onEditFilters,
  onClearFilters,
  onMapReady,
}: DesktopSearchResultsProps) {
  const activePlace = hoveredPlace || selectedPlace

  const handleMarkerClick = (index: number, place: SearchPlaceInView) => {
    onPlaceSelect(index, place, false)
  }

  const handlePopupClose = () => {
    onPlaceSelect(-1, null)
  }

  return (
    <>
      {currentFilters && (
        <SearchFiltersBar
          filters={currentFilters}
          onEdit={onEditFilters}
          onClear={onClearFilters}
        />
      )}

      <div className="h-full flex-1">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel
            defaultSize={50}
            minSize={30}
            className="h-full overflow-hidden"
          >
            <SearchResults
              places={places}
              isLoading={isLoading}
              onNewSearch={onNewSearch}
              hasFilters={hasFilters}
              selectedPlace={selectedPlace}
              activeCardIndex={activeCardIndex}
              onPlaceSelect={onPlaceSelect}
              onPlaceHover={onPlaceHover}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50} minSize={30} className="h-full">
            <Map
              places={places}
              parksWithGeometry={parksWithGeometry}
              onBoundsChange={onBoundsChange}
              activePlace={activePlace}
              onMarkerClick={handleMarkerClick}
              onPopupClose={handlePopupClose}
              onMapReady={onMapReady}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  )
}
