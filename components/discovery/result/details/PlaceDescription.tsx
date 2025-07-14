'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface PlaceDescriptionProps {
  description: string
  starRating?: number
  starRatingReason?: string
}

export default function PlaceDescription({
  description,
  starRating,
  starRatingReason,
}: PlaceDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [needsTruncation, setNeedsTruncation] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  // Check if text actually overflows the 5-line height
  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight)
        const maxHeight = lineHeight * 5 // 5 lines
        const actualHeight = textRef.current.scrollHeight
        setNeedsTruncation(actualHeight > maxHeight)
      }
    }

    checkTruncation()
    // Re-check on window resize
    window.addEventListener('resize', checkTruncation)
    return () => window.removeEventListener('resize', checkTruncation)
  }, [description])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="h-5 w-5" />
          About This Place
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* AI Rating Reason - Display first if present */}
        {starRating && starRatingReason && (
          <div className="bg-primary/5 border-primary/10 mb-4 rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 3 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < starRating
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <span className="text-primary text-sm font-medium">
                AI Recommendation
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {starRatingReason}
            </p>
          </div>
        )}

        {/* Main Description */}
        <div>
          <p
            ref={textRef}
            className={`text-muted-foreground text-sm leading-relaxed ${
              needsTruncation && !isExpanded ? 'line-clamp-5' : ''
            }`}
          >
            {description}
          </p>

          {/* Show More/Less Button - Only show if content needs truncation */}
          {needsTruncation && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary hover:text-primary/80 mt-2 text-sm font-medium"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
