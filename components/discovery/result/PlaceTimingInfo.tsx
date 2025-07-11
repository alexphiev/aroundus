'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlaceResultItem } from '@/types/result.types'
import { AlertTriangle, Clock } from 'lucide-react'

interface PlaceTimingInfoProps {
  place: PlaceResultItem
}

export default function PlaceTimingInfo({ place }: PlaceTimingInfoProps) {
  // Don't render if no timing information is available
  if (!place.bestTimeToVisit && !place.timeToAvoid) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Best Times to Visit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {place.bestTimeToVisit && (
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <Clock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800 mb-1">
                Recommended Time
              </p>
              <p className="text-sm text-green-700">{place.bestTimeToVisit}</p>
            </div>
          </div>
        )}
        {place.timeToAvoid && (
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-orange-800 mb-1">Times to Avoid</p>
              <p className="text-sm text-orange-700">{place.timeToAvoid}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
