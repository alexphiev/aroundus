'use client'

import { getTransportIcon } from '@/components/discovery/utils/iconUtils'
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

  console.log({ photos: place.photos })

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
        className={`card-interactive card-layout ${
          isActive ? 'card-active' : ''
        }`}
        onClick={onClick}
      >
        {/* Photo Carousel */}
        {place.photos && place.photos.length > 0 && (
          <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
            <Image
              src={place.photos[currentPhotoIndex].url}
              alt={`${place.name} - Photo ${currentPhotoIndex + 1}`}
              className="w-full h-full object-cover"
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
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/50 text-white hover:bg-black/70"
                  onClick={prevPhoto}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/50 text-white hover:bg-black/70"
                  onClick={nextPhoto}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Photo Indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {place.photos.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Photo Attribution */}
            {place.photos[currentPhotoIndex].attribution && (
              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Photo by {place.photos[currentPhotoIndex].attribution}
              </div>
            )}
          </div>
        )}

        <CardHeader className="flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex gap-1 items-center">
              <PlaceIcons
                landscape={place.landscape}
                activity={place.activity}
              />

              {/* AI Star Rating */}
              {place.starRating && (
                <div className="flex items-center gap-0.5 ml-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < (place.starRating || 0)
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Google Rating */}
              {place.googleRating && (
                <div className="flex items-center gap-1 ml-2 text-xs text-muted-foreground">
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
                        ? 'text-green-600 bg-green-50'
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
                        ? 'text-red-600 bg-red-50'
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
        <CardContent className="flex-1 flex flex-col">
          {/* Why Recommended */}
          {place.whyRecommended ? (
            <CardDescription className="text-card-description mb-3 flex-shrink-0">
              {place.whyRecommended}
            </CardDescription>
          ) : (
            <CardDescription className="text-card-description mb-3 flex-shrink-0">
              {place.description}
            </CardDescription>
          )}

          {/* Reviews Section */}
          {place.reviews && place.reviews.length > 0 && (
            <div className="mb-3 space-tight">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Recent Reviews:
              </div>
              <div className="space-y-2">
                {place.reviews.slice(0, 2).map((review, idx) => (
                  <div key={idx} className="bg-muted/30 p-2 rounded text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`h-2.5 w-2.5 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-muted-foreground font-medium">
                        {review.author}
                      </span>
                    </div>
                    {review.text && (
                      <p className="text-muted-foreground leading-relaxed line-clamp-2">
                        {review.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 space-content">
            {/* Duration Information - Single Row */}
            {(place.estimatedActivityDuration ||
              place.estimatedTransportTime) && (
              <div className="flex gap-2 flex-wrap">
                {place.estimatedActivityDuration && (
                  <span className="badge-info">
                    Activity:{' '}
                    {abbreviateDuration(place.estimatedActivityDuration)}
                  </span>
                )}
                {place.estimatedTransportTime && (
                  <span className="badge-warning flex items-center gap-1">
                    {getTransportIcon(place.transportMode)}
                    {abbreviateDuration(place.estimatedTransportTime)}
                  </span>
                )}
              </div>
            )}

            {/* Best Time to Visit - Bottom with 3-line limit */}
            {place.bestTimeToVisit && (
              <div className="space-tight">
                <div className="p-2 bg-status-success rounded-md">
                  <p className="text-xs text-status-success-foreground leading-relaxed line-clamp-3">
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
