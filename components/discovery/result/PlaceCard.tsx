'use client'

import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bookmark, Star, ThumbsUp, ThumbsDown } from 'lucide-react'
import { PlaceResultItem } from '@/types/result.types'
import { getTransportIcon } from '@/components/discovery/utils/iconUtils'
import PlaceIcons from './PlaceIcons'
import { abbreviateDuration } from '@/lib/utils'

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
        <CardHeader className="flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex gap-1 items-center">
              <PlaceIcons
                landscape={place.landscape}
                activity={place.activity}
              />

              {/* Star Rating */}
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
