'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { abbreviateDuration } from '@/lib/utils'
import { PlaceResultItem } from '@/types/result.types'
import { getIcon, IconType } from '@/utils/icon.utils'
import { motion } from 'framer-motion'
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Star,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import PlaceIcons from './PlaceIcons'

interface PlaceCardProps {
  place: PlaceResultItem
  index: number
  isActive: boolean
  isSaved: boolean
  showSaveButton: boolean
  isSaving: boolean
  onClick: () => void
  onSave: (e: React.MouseEvent) => void
  onFeedback?: (feedback: 'liked' | 'disliked' | null) => void
}

export default function PlaceCard({
  place,
  index,
  isActive,
  isSaved,
  showSaveButton,
  isSaving,
  onClick,
  onSave,
  onFeedback,
}: PlaceCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (place.photos && place.photos.length > 0) {
      setCurrentPhotoIndex((prev) =>
        prev === place.photos!.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (place.photos && place.photos.length > 0) {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? place.photos!.length - 1 : prev - 1
      )
    }
  }

  return (
    <motion.div
      key={place.id || index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        ease: 'easeOut',
      }}
      layout
    >
      <Card
        className={`card-interactive card-layout pt-0 ${
          isActive ? 'card-active' : ''
        }`}
        onClick={onClick}
      >
        {/* Photo Carousel */}
        {place.photos && place.photos.length > 0 && (
          <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
            <Image
              src={place.photos[currentPhotoIndex].url}
              alt={`${place.name} - Photo ${currentPhotoIndex + 1}`}
              className="h-full w-full object-cover"
              width={300}
              height={300}
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none'
              }}
            />

            {/* Photo Navigation */}
            {place.photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 left-2 h-8 w-8 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={prevPhoto}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                  onClick={nextPhoto}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Photo Indicators */}
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  {place.photos.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 w-2 rounded-full ${
                        index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <CardHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1">
              <PlaceIcons
                landscape={place.landscape}
                activity={place.activity}
              />

              {/* Google Rating */}
              {place.googleRating && (
                <div className="text-muted-foreground ml-2 flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{place.googleRating.toFixed(1)}</span>
                  {place.reviewCount && (
                    <span className="text-muted-foreground/70">
                      ({place.reviewCount})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Feedback buttons */}
              {onFeedback && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${
                      place.userFeedback === 'liked'
                        ? 'bg-green-50 text-green-600'
                        : 'text-muted-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onFeedback(
                        place.userFeedback === 'liked' ? null : 'liked'
                      )
                    }}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${
                      place.userFeedback === 'disliked'
                        ? 'bg-red-50 text-red-600'
                        : 'text-muted-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onFeedback(
                        place.userFeedback === 'disliked' ? null : 'disliked'
                      )
                    }}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Save button */}
              {showSaveButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${isSaved ? 'text-primary' : ''}`}
                  disabled={isSaving}
                  onClick={onSave}
                >
                  <Bookmark
                    className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`}
                  />
                </Button>
              )}
            </div>
          </div>
          <CardTitle className="text-card-title mt-2">{place.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          {/* AI Recommendation */}
          {place.starRatingReason ? (
            <CardDescription className="text-card-description mb-3 flex-shrink-0">
              {place.starRatingReason}
            </CardDescription>
          ) : (
            <CardDescription className="text-card-description mb-3 flex-shrink-0">
              {place.description}
            </CardDescription>
          )}

          <div className="space-content flex-1">
            {/* Duration Information - Single Row */}
            {(place.estimatedActivityDuration ||
              place.estimatedTransportTime) && (
              <div className="flex flex-wrap gap-2">
                {place.estimatedActivityDuration && (
                  <span className="badge-info">
                    Activity:{' '}
                    {abbreviateDuration(place.estimatedActivityDuration)}
                  </span>
                )}
                {place.estimatedTransportTime && (
                  <span className="badge-warning flex items-center gap-1">
                    {getIcon(IconType.TRANSPORT, place.transportMode, 4)}
                    {abbreviateDuration(place.estimatedTransportTime)}
                  </span>
                )}
              </div>
            )}

            {/* Best Time to Visit - Bottom with 3-line limit */}
            {place.bestTimeToVisit && (
              <div className="space-tight">
                <div className="bg-status-success rounded-md p-2">
                  <p className="text-status-success-foreground line-clamp-3 text-xs leading-relaxed">
                    Best: {place.bestTimeToVisit}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
