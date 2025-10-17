'use client'

import { PlaceResultItem } from '@/types/result.types'
import { SearchFormValues } from '@/validation/search-form.validation'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'

const MobileSearchResult = dynamic(
  () => import('@/components/search/result/MobileSearchResult'),
  {
    ssr: true,
  }
)
const DesktopSearchResult = dynamic(
  () => import('@/components/search/result/DesktopSearchResult'),
  {
    ssr: true,
  }
)

export interface SearchResultProps {
  placeResults: PlaceResultItem[] | null
  title: string
  baseLocation?: { latitude: number; longitude: number } | null
  showSaveButton?: boolean
  emptyStateMessage?: string
  isLoadingNew?: boolean
  className?: string
  onSavePlace?: (place: PlaceResultItem) => Promise<void>
  onNewSearch?: () => void
  showNewSearchButton?: boolean
  onCardClick?: (index: number) => void
  searchQuery?: SearchFormValues | null
  showMapOnly?: boolean
  userLocation?: { latitude: number; longitude: number } | null
}

export default function SearchResult(props: SearchResultProps) {
  const { searchQuery, baseLocation } = props

  const mapBaseLocation = useMemo(() => {
    if (searchQuery?.locationType === 'custom' && searchQuery.customLocation) {
      return {
        latitude: searchQuery.customLocation.lat,
        longitude: searchQuery.customLocation.lng,
      }
    }

    return baseLocation
  }, [searchQuery, baseLocation])

  return (
    <div className="h-full">
      <div className="hidden h-full md:block">
        <DesktopSearchResult baseLocation={mapBaseLocation} {...props} />
      </div>

      <div className="block h-full md:hidden">
        <MobileSearchResult baseLocation={mapBaseLocation} {...props} />
      </div>
    </div>
  )
}
