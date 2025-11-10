'use server'

import { SearchPlaceInView, SearchPlacePhoto } from '@/types/search.types'
import { Database } from '@/types/supabase'
import { distanceToRadiusKm } from '@/utils/distance.utils'
import { createClient } from '@/utils/supabase/server'

// Type for the RPC function return value
type SearchPlacesByLocationResult =
  Database['public']['Functions']['search_places_by_location']['Returns'][number]

interface SearchPlacesParams {
  latitude: number
  longitude: number
  radiusKm: number
  limit?: number
}

/**
 * Fetch photos for a single place from the place_photos table
 * Used for lazy loading photos when place cards become visible
 * @param placeId - The place ID to fetch photos for
 * @param limit - Optional limit on number of photos (default: no limit)
 */
export async function getPlacePhotos(
  placeId: string,
  limit?: number
): Promise<SearchPlacePhoto[]> {
  const supabase = await createClient()

  let query = supabase
    .from('place_photos')
    .select('id, place_id, url, attribution, is_primary, source')
    .eq('place_id', placeId)
    .order('is_primary', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching photos for place:', placeId, error)
    return []
  }

  return (
    data?.map((photo) => ({
      id: photo.id,
      url: photo.url,
      attribution: photo.attribution,
      is_primary: photo.is_primary,
      source: photo.source,
    })) || []
  )
}

/**
 * Search places by location using RPC function
 * Returns SearchPlaceInView with all fields from search_places_by_location RPC (including distance_km)
 * Photos are loaded lazily at the component level
 */
export async function searchPlacesAction(
  params: SearchPlacesParams
): Promise<SearchPlaceInView[]> {
  const supabase = await createClient()
  const { latitude, longitude, radiusKm, limit = 20 } = params

  // Fetch places using RPC function - returns exactly what the RPC returns
  // This includes distance_km calculated by ST_Distance in the SQL function
  const { data: placesData, error: placesError } = await supabase.rpc(
    'search_places_by_location',
    {
      search_lat: latitude,
      search_lng: longitude,
      radius_km: radiusKm,
      result_limit: limit,
      min_score: 3, // Quite restrictive, but we want to be sure we're getting good results
    }
  )

  if (placesError) {
    console.error('Error searching places:', placesError)
    return []
  }

  if (!placesData || placesData.length === 0) {
    return []
  }

  // Map RPC return type to SearchPlaceInView (photos will be loaded lazily)
  // The RPC function already returns all the fields we need including distance_km,
  // we just add photos field which is undefined initially
  const places: SearchPlaceInView[] = placesData.map(
    (place: SearchPlacesByLocationResult) => ({
      ...place,
      // photos will be undefined initially, loaded lazily
      photos: undefined,
    })
  )

  return places
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
