'use client'

import { PlaceResultItem } from '@/types/result.types'
import { FormValues } from '@/types/search-history.types'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'

// Lazy load components for better performance
const MobileDiscoveryResult = dynamic(
  () => import('@/components/discovery/result/MobileDiscoveryResult'),
  {
    ssr: true,
  }
)
const DesktopDiscoveryResult = dynamic(
  () => import('@/components/discovery/result/DesktopDiscoveryResult'),
  {
    ssr: true,
  }
)

export interface DiscoveryResultProps {
  placeResults: PlaceResultItem[] | null
  title: string
  subtitle: string
  onSearchClick?: () => void
  baseLocation?: { latitude: number; longitude: number } | null
  showSaveButton?: boolean
  emptyStateMessage?: string
  isLoadingNew?: boolean
  isLoadingHistory?: boolean
  className?: string
  onSavePlace?: (place: PlaceResultItem) => Promise<void>
  hasMoreResults?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  onNewSearch?: () => void
  showNewSearchButton?: boolean
  onCardClick?: (index: number) => void
  searchQuery?: FormValues | null
  generatedTitle?: string | null
  onEditFilters?: () => void
  onTitleEdit?: (newTitle: string) => void
}

export default function DiscoveryResult(props: DiscoveryResultProps) {
  const { searchQuery, baseLocation } = props

  // Calculate base location for map - use search location if available, fallback to user location
  const mapBaseLocation = useMemo(() => {
    if (searchQuery?.locationType === 'custom' && searchQuery.customLocation) {
      const result = {
        latitude: searchQuery.customLocation.lat,
        longitude: searchQuery.customLocation.lng,
      }
      return result
    }

    return baseLocation
  }, [searchQuery, baseLocation])

  return (
    <div className="h-full">
      {/* Mobile Layout - render conditionally */}
      <div className="hidden h-full md:block">
        <DesktopDiscoveryResult baseLocation={mapBaseLocation} {...props} />
      </div>

      <div className="block h-full md:hidden">
        <MobileDiscoveryResult baseLocation={mapBaseLocation} {...props} />
      </div>
    </div>
  )
}
