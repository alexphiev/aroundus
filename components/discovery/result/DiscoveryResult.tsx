'use client'

import { PlaceResultItem } from '@/types/result.types'
import { FormValues } from '@/types/search-history.types'
import dynamic from 'next/dynamic'

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
  userLocation?: { latitude: number; longitude: number } | null
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
  return (
    <div className="h-full">
      {/* Mobile Layout - render conditionally */}
      <div className="hidden md:block h-full">
        <DesktopDiscoveryResult {...props} />
      </div>

      <div className="block md:hidden h-full">
        <MobileDiscoveryResult {...props} />
      </div>
    </div>
  )
}
