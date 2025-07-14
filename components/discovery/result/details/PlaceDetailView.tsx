'use client'

import { PlaceResultItem } from '@/types/result.types'
import { motion } from 'framer-motion'
import PlaceInfoGrid from '../PlaceInfoGrid'
import PlaceTimingInfo from '../PlaceTimingInfo'
import PlaceDescription from './PlaceDescription'
import PlaceHeader from './PlaceHeader'
import PlacePhotoGallery from './PlacePhotoGallery'
import PlacePracticalInfo from './PlacePracticalInfo'
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
      className="flex h-full flex-col pb-24 md:pb-0"
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

      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
        <PlaceDescription
          description={place.description}
          starRating={place.starRating}
          starRatingReason={place.starRatingReason}
        />

        {place.photos && place.photos.length > 0 && (
          <PlacePhotoGallery 
            photos={place.photos} 
            placeName={place.name}
            googleMapsUri={place.googleMapsUri || ''}
          />
        )}
        <PlaceInfoGrid place={place} />
        <PlaceCurrentConditions place={place} />
        <PlacePracticalInfo place={place} />
        <PlaceTimingInfo place={place} />
        {((place.reviews && place.reviews.length > 0) ||
          place.googleRating) && (
          <PlaceReviews
            reviews={place.reviews || []}
            googleRating={place.googleRating}
            reviewCount={place.reviewCount}
            googleMapsUri={place.googleMapsUri}
          />
        )}
        <WeatherForecast lat={place.lat} lon={place.long} />
      </div>
    </motion.div>
  )
}
