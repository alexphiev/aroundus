'use client'

import { Card, CardContent } from '@/components/ui/card'
import { PlaceResultItem } from '@/types/result.types'
import { getIcon, IconType } from '@/utils/icon.utils'
import { Timer } from 'lucide-react'

interface PlaceInfoGridProps {
  place: PlaceResultItem
}

export default function PlaceInfoGrid({ place }: PlaceInfoGridProps) {
  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Environment & Activity */}
          <div className="flex items-center gap-3">
            {getIcon(IconType.LANDSCAPE, place.landscape, 5, 'primary')}
            <div>
              <p className="font-medium">Environment</p>
              <p className="text-sm text-muted-foreground capitalize">
                {place.landscape || 'Natural area'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getIcon(IconType.ACTIVITY, place.activity, 5, 'primary')}
            <div>
              <p className="font-medium">Activity Type</p>
              <p className="text-sm text-muted-foreground capitalize">
                {place.activity || 'Outdoor activity'}
              </p>
            </div>
          </div>
          {/* Duration & Travel */}
          {place.estimatedActivityDuration && (
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Activity Duration</p>
                <p className="text-sm text-muted-foreground">
                  {place.estimatedActivityDuration}
                </p>
              </div>
            </div>
          )}
          {place.estimatedTransportTime && (
            <div className="flex items-center gap-3">
              {getIcon(IconType.TRANSPORT, place.transportMode, 5, 'primary')}
              <div>
                <p className="font-medium">Travel Time</p>
                <p className="text-sm text-muted-foreground">
                  {place.estimatedTransportTime}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
