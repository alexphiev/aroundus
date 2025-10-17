'use server'

import { createClient } from '@/utils/supabase/server'

interface SearchPlaceResult {
  id: string
  name: string
  description: string
  type: string
  source: string
  lat: number
  long: number
  score: number
  distance_km: number
  metadata: Record<string, unknown> | null
  website: string | null
  wikipedia_query: string | null
  country: string | null
  region: string | null
}

interface SearchPlacesParams {
  latitude: number
  longitude: number
  radiusKm: number
  limit?: number
}

function distanceToRadiusKm(distance: string, transportType: string): number {
  const baseDistances: Record<string, number> = {
    'less than 30 min': 10,
    'less than 1 hour': 25,
    'less than 2 hours': 50,
    'between 1 and 2 hours': 50,
    'between 2 and 3 hours': 100,
    'between 4 and 5 hours': 150,
  }

  let baseRadius = baseDistances[distance] || 50

  if (transportType === 'foot') {
    baseRadius = baseRadius * 0.15
  } else if (transportType === 'bike') {
    baseRadius = baseRadius * 0.4
  } else if (transportType === 'public_transport') {
    baseRadius = baseRadius * 0.7
  }

  return baseRadius
}

export async function searchPlacesAction(params: SearchPlacesParams) {
  try {
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
      return {
        success: false,
        error: {
          message: error.message,
          type: 'database_error',
        },
      }
    }

    return {
      success: true,
      data: data as unknown as SearchPlaceResult[],
    }
  } catch (error) {
    console.error('Unexpected error in searchPlacesAction:', error)
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'unexpected_error',
      },
    }
  }
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
