import { PlaceResultItem } from '@/types/result.types'

interface PlaceData {
  id: string
  name: string
  description: string
  type: string
  lat: number
  long: number
}

export function convertPlaceToResultItem(place: PlaceData): PlaceResultItem {
  return {
    id: place.id,
    name: place.name || 'Unnamed Place',
    description: place.description || '',
    lat: place.lat,
    long: place.long,
    landscape: place.type || undefined,
    activity: undefined,
    photos: [],
    googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.long}`,
    googleMapsUri: undefined,
    starRating: undefined,
    starRatingReason: undefined,
  }
}

export function mapActivityToPlaceTypes(activity: string): string[] {
  const activityMapping: Record<string, string[]> = {
    hiking: ['trail', 'mountain', 'hill', 'peak', 'viewpoint', 'national_park', 'regional_park'],
    biking: ['trail', 'bike_trail', 'park', 'national_park', 'regional_park'],
    swimming: ['beach', 'lake', 'river', 'swimming_area', 'waterfall'],
    relaxing: ['park', 'garden', 'beach', 'lake', 'viewpoint', 'forest'],
    photography: ['viewpoint', 'peak', 'waterfall', 'beach', 'monument', 'national_park'],
  }

  return activityMapping[activity] || []
}
