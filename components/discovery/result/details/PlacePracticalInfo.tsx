import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlaceResultItem } from '@/types/result.types'
import {
  Clock,
  CreditCard,
  ExternalLink,
  MapPin,
  ParkingCircle,
} from 'lucide-react'

interface Props {
  place: PlaceResultItem
}

export default function PlacePracticalInfo({ place }: Props) {
  const { googleMapsLink, operatingHours, entranceFee, parkingInfo } = place

  if (!googleMapsLink && !operatingHours && !entranceFee && !parkingInfo) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Practical Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                {place.operatingHours}
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
      </CardContent>
    </Card>
  )
}
