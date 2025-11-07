'use server'

import { distanceToRadiusKm } from '@/utils/distance.utils'
import { createClient } from '@/utils/supabase/server'
import { PlacesInView } from './explore.actions'

interface SearchPlacesParams {
  latitude: number
  longitude: number
  radiusKm: number
  limit?: number
}

export async function searchPlacesAction(
  params: SearchPlacesParams
): Promise<PlacesInView[]> {
  const supabase = await createClient()
  const { latitude, longitude, radiusKm, limit = 20 } = params

  const { data, error } = await supabase.rpc('search_places_by_location', {
    search_lat: latitude,
    search_lng: longitude,
    radius_km: radiusKm,
    result_limit: limit,
    min_score: 3, // Quite restrictive, but we want to be sure we're getting good results
  })

  if (error) {
    console.error('Error searching places:', error)
    return []
  }

  return data
}

export async function searchPlaces(
  location: { latitude: number; longitude: number },
  distance: string,
  transportType: string
) {
  const radiusKm = distanceToRadiusKm(distance, transportType)

  return await searchPlacesAction({
    latitude: location.latitude,
    longitude: location.longitude,
    radiusKm,
    limit: 20,
  })
}
