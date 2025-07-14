'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlaceReview } from '@/types/result.types'
import { MessageSquare, Star, User } from 'lucide-react'
import { useState } from 'react'

interface PlaceReviewsProps {
  reviews: PlaceReview[]
  googleRating?: number
  reviewCount?: number
}

export default function PlaceReviews({
  reviews,
  googleRating,
  reviewCount,
}: PlaceReviewsProps) {
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set())

  const toggleReviewExpansion = (index: number) => {
    setExpandedReviews((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return 'Recently'
    }
  }

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (!reviews.length && !googleRating) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Reviews
          {googleRating && (
            <div className="flex items-center gap-1 ml-auto text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{googleRating.toFixed(1)}</span>
              {reviewCount && (
                <span className="text-muted-foreground">
                  ({reviewCount} reviews)
                </span>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reviews.slice(0, 3).map((review, index) => {
            const isExpanded = expandedReviews.has(index)
            const shouldShowExpand = review.text.length > 150

            return (
              <div
                key={index}
                className="border-b border-muted pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {review.author}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.publishTime)}
                      </span>
                    </div>

                    {review.text && (
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        <p>
                          {isExpanded ? review.text : truncateText(review.text)}
                        </p>
                        {shouldShowExpand && (
                          <button
                            onClick={() => toggleReviewExpansion(index)}
                            className="text-primary hover:text-primary/80 text-xs mt-1 font-medium"
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-muted">
          <p className="text-xs text-muted-foreground">
            Reviews from Google Places
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
