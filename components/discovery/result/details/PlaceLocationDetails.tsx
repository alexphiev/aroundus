'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlaceResultItem } from '@/types/result.types'
import { MapPin, Navigation } from 'lucide-react'

interface PlaceLocationDetailsProps {
  place: PlaceResultItem
}

export default function PlaceLocationDetails({
  place,
}: PlaceLocationDetailsProps) {
  // Handle get directions
  const handleGetDirections = () => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.long}`
    window.open(googleMapsUrl, '_blank')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Details
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="font-medium">Coordinates:</span>
          <Badge variant="outline" className="font-mono text-sm">
            {place.lat.toFixed(6)}, {place.long.toFixed(6)}
          </Badge>
        </div>
        <Button onClick={handleGetDirections} className="w-full" size="lg">
          <Navigation className="h-5 w-5 mr-2" />
          Get Directions
        </Button>
      </CardContent>
    </Card>
  )
}
