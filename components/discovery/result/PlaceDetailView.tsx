'use client'

import { PlaceResultItem } from '@/types/result.types'
import { motion } from 'framer-motion'
import PlaceDescription from './PlaceDescription'
import PlaceHeader from './PlaceHeader'
import PlaceInfoGrid from './PlaceInfoGrid'
import PlaceLocationDetails from './PlaceLocationDetails'
import PlaceRecommendation from './PlaceRecommendation'
import PlaceTimingInfo from './PlaceTimingInfo'
import WeatherForecast from './WeatherForecast'

interface PlaceDetailViewProps {
  place: PlaceResultItem
  onBack: () => void
  onSave?: (place: PlaceResultItem) => Promise<void>
  isSaved?: boolean
  showSaveButton?: boolean
}

export default function PlaceDetailView({
  place,
  onBack,
  onSave,
  isSaved = false,
  showSaveButton = true,
}: PlaceDetailViewProps) {
  // Handle share
  const handleShare = async () => {
    const shareText = `${place.name}: ${place.description}\n\nLocation: ${place.lat}, ${place.long}${place.googleMapsLink ? `\n\nGoogle Maps: ${place.googleMapsLink}` : ''}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: place.name,
          text: shareText,
          url: place.googleMapsLink || window.location.href,
        })
      } catch {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText)
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      {/* Header with Back Button and Actions */}
      <PlaceHeader
        place={place}
        onBack={onBack}
        onSave={onSave}
        onShare={handleShare}
        isSaved={isSaved}
        showSaveButton={showSaveButton}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <PlaceDescription description={place.description} />

        {/* Quick Info Grid */}
        <PlaceInfoGrid place={place} />

        {/* Timing Information */}
        <PlaceTimingInfo place={place} />

        {/* Why Recommended */}
        {place.whyRecommended && (
          <PlaceRecommendation whyRecommended={place.whyRecommended} />
        )}

        {/* Weather Forecast */}
        <WeatherForecast lat={place.lat} lon={place.long} />

        {/* Location Details */}
        <PlaceLocationDetails place={place} />
      </div>
    </motion.div>
  )
}
