'use client'

import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { PlaceResultItem } from '@/types/result.types'
import { ArrowLeft, Bookmark, Share2 } from 'lucide-react'

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
    <div className="bg-background flex-shrink-0 border-b px-3 py-2">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {isMobile ? '' : 'Back to Places'}
        </Button>
        {/* Place Title and Rating */}
        <h1 className="text-xl font-semibold">{place.name}</h1>

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
    </div>
  )
}
