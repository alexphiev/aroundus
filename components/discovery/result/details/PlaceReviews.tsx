'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlaceReview } from '@/types/result.types'
import { MessageSquare, Star, User } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface PlaceReviewsProps {
  reviews: PlaceReview[]
  googleRating?: number
  reviewCount?: number
  googleMapsUri?: string
}

export default function PlaceReviews({
  reviews,
  googleRating,
  reviewCount,
  googleMapsUri,
}: PlaceReviewsProps) {
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set())
  const [showAllReviews, setShowAllReviews] = useState(false)

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

  const handleGoogleReviewsClick = () => {
    if (googleMapsUri) {
      // Open Google Maps page (which includes reviews) in a new tab
      window.open(googleMapsUri, '_blank', 'noopener,noreferrer')
    }
  }

  if (!reviews.length && !googleRating) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Reviews
          {googleRating && (
            <div
              className={`ml-auto flex items-center gap-1 text-sm ${
                googleMapsUri
                  ? 'hover:text-primary cursor-pointer transition-colors'
                  : ''
              }`}
              onClick={googleMapsUri ? handleGoogleReviewsClick : undefined}
              role={googleMapsUri ? 'button' : undefined}
              tabIndex={googleMapsUri ? 0 : undefined}
              onKeyDown={
                googleMapsUri
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleGoogleReviewsClick()
                      }
                    }
                  : undefined
              }
            >
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
          {reviews
            .slice(0, showAllReviews ? reviews.length : 2)
            .map((review, index) => {
              const isExpanded = expandedReviews.has(index)
              const shouldShowExpand = review.text.length > 150

              return (
                <div
                  key={index}
                  className="border-muted border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                      <User className="text-muted-foreground h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-medium">
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
                        <span className="text-muted-foreground text-xs">
                          {formatDate(review.publishTime)}
                        </span>
                      </div>

                      {review.text && (
                        <div className="text-muted-foreground text-sm leading-relaxed">
                          <p>
                            {isExpanded
                              ? review.text
                              : truncateText(review.text)}
                          </p>
                          {shouldShowExpand && (
                            <button
                              onClick={() => toggleReviewExpansion(index)}
                              className="text-primary hover:text-primary/80 mt-1 text-xs font-medium"
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

        {/* Show More/Less Button */}
        {reviews.length > 2 && (
          <div className="border-muted mt-4 border-t pt-4">
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="text-primary hover:text-primary/80 text-sm font-medium"
            >
              {showAllReviews
                ? 'Show Less Reviews'
                : `Show More Reviews (${reviews.length - 2} more)`}
            </button>
          </div>
        )}

        <div className="border-muted mt-4 border-t pt-4">
          {googleMapsUri ? (
            <Link href={googleMapsUri} target="_blank">
              <p className="text-muted-foreground text-xs hover:underline">Source: Google Maps</p>
            </Link>
          ) : (
            <p className="text-muted-foreground text-xs">Source: Google Maps</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
