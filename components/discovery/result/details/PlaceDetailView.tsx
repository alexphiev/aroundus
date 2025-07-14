'use client'

import { PlaceResultItem } from '@/types/result.types'
import { motion } from 'framer-motion'
import PlaceInfoGrid from '../PlaceInfoGrid'
import PlaceTimingInfo from '../PlaceTimingInfo'
import PlaceDescription from './PlaceDescription'
import PlaceHeader from './PlaceHeader'
import PlaceLocationDetails from './PlaceLocationDetails'
import PlacePhotoGallery from './PlacePhotoGallery'
import PlacePracticalInfo from './PlacePracticalInfo'
import PlaceRecommendation from './PlaceRecommendation'
import PlaceReviews from './PlaceReviews'
import WeatherForecast from './PlaceWeatherForecast'
import PlaceCurrentConditions from './PlaceCurrentConditions'

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

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <PlaceDescription description={place.description} />

        {place.photos && place.photos.length > 0 && (
          <PlacePhotoGallery photos={place.photos} placeName={place.name} />
        )}
        <PlaceInfoGrid place={place} />
        <PlaceCurrentConditions place={place} />
        <PlacePracticalInfo place={place} />
        <PlaceTimingInfo place={place} />
        {place.whyRecommended && (
          <PlaceRecommendation whyRecommended={place.whyRecommended} />
        )}
        {((place.reviews && place.reviews.length > 0) ||
          place.googleRating) && (
          <PlaceReviews
            reviews={place.reviews || []}
            googleRating={place.googleRating}
            reviewCount={place.reviewCount}
          />
        )}
        <WeatherForecast lat={place.lat} lon={place.long} />
        <PlaceLocationDetails place={place} />
      </div>
    </motion.div>
  )
}
