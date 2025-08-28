import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlaceResultItem } from '@/types/result.types'
import {
  Clock,
  CreditCard,
  ExternalLink,
  MapPin,
  ParkingCircle,
  Accessibility,
} from 'lucide-react'

interface Props {
  place: PlaceResultItem
}

export default function PlacePracticalInfo({ place }: Props) {
  const { googleMapsLink, operatingHours, entranceFee, parkingInfo, accessibilityInfo } = place

  // Parse operating hours to check if open 24 hours all days
  const parseOperatingHours = (hours: string) => {
    if (!hours) return hours
    
    // Check if all days mention "Open 24 hours" or "24 hours"
    const lines = hours.split('\n').filter(line => line.trim())
    const allDays24Hours = lines.every(line => 
      line.toLowerCase().includes('open 24 hours') || 
      line.toLowerCase().includes('24 hours')
    )
    
    if (allDays24Hours && lines.length >= 7) {
      return 'Open 24 hours'
    }
    
    return hours
  }

  // Handle opening in Google Maps
  const handleOpenInMaps = () => {
    let googleMapsUrl: string
    if (place.placeId) {
      googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.placeId}`
    } else {
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.long}`
    }
    window.open(googleMapsUrl, '_blank')
  }

  // Always show the component since we now have the Get Directions button
  const hasAnyInfo = googleMapsLink || operatingHours || entranceFee || parkingInfo || accessibilityInfo

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Practical Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAnyInfo && (
          <div className="space-y-4">
            {place.googleMapsLink && (
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium">Google Maps</p>
              <a
                href={place.googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Open in Maps <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
        {place.operatingHours && (
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium">Operating Hours</p>
              <p className="text-sm text-muted-foreground">
                {parseOperatingHours(place.operatingHours)}
              </p>
            </div>
          </div>
        )}
        {place.entranceFee && (
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-medium">Entrance Fee</p>
              <p className="text-sm text-muted-foreground">
                {place.entranceFee}
              </p>
            </div>
          </div>
        )}
        {place.parkingInfo && (
          <div className="flex items-center gap-3">
            <ParkingCircle className="h-6 w-6 text-purple-600" />
            <div>
              <p className="font-medium">Parking</p>
              <p className="text-sm text-muted-foreground">
                {place.parkingInfo}
              </p>
            </div>
          </div>
        )}
        {place.accessibilityInfo && (
          <div className="flex items-center gap-3">
            <Accessibility className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium">Accessibility</p>
              <p className="text-sm text-muted-foreground">
                {place.accessibilityInfo}
              </p>
            </div>
          </div>
        )}
          </div>
        )}
        
        {/* Get Directions Button */}
        <div className={hasAnyInfo ? "pt-4 border-t border-muted" : ""}>
          <Button onClick={handleOpenInMaps} className="w-full" size="lg">
            <MapPin className="h-5 w-5 mr-2" />
            Open in Google Maps
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
