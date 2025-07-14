'use client'

import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { PlaceResultItem } from '@/types/result.types'
import { ArrowLeft, Bookmark, Share2, Star } from 'lucide-react'

interface PlaceHeaderProps {
  place: PlaceResultItem
  onBack: () => void
  onSave?: (place: PlaceResultItem) => Promise<void>
  onShare: () => void
  isSaved?: boolean
  showSaveButton?: boolean
}

export default function PlaceHeader({
  place,
  onBack,
  onSave,
  onShare,
  isSaved = false,
  showSaveButton = true,
}: PlaceHeaderProps) {
  const isMobile = useIsMobile()

  // Handle save action
  const handleSave = async () => {
    if (onSave) {
      await onSave(place)
    }
  }

  return (
    <div className="flex-shrink-0 py-4 px-6 bg-background border-b">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isMobile ? '' : 'Back to Places'}
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className={`h-4 w-4 ${isMobile ? 'mr-0' : 'mr-2'}`} />
            {isMobile ? '' : 'Share'}
          </Button>
          {showSaveButton && (
            <Button
              variant={isSaved ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleSave}
            >
              <Bookmark
                className={`h-4 w-4 ${isMobile ? 'mr-0' : 'mr-2'} ${
                  isSaved ? 'fill-current' : ''
                }`}
              />
              {isMobile ? '' : isSaved ? 'Saved' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* Place Title and Rating */}
      <h1 className="text-xl md:text-3xl font-bold">
        {place.name}
        {place.starRating && (
          <span className="inline-flex items-center gap-1 ml-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 md:h-5 md:w-5 ${
                  i < (place.starRating || 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </span>
        )}
      </h1>
    </div>
  )
}
