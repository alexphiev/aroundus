'use server'

import { SearchPlaceInView, SearchPlacePhoto } from '@/types/search.types'
import { Json } from '@/types/supabase'
import { distanceToRadiusKm } from '@/utils/distance.utils'
import { createClient } from '@/utils/supabase/server'

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
    .select('id, place_id, url, attribution, is_primary')
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
    })) || []
  )
}

/**
 * Search places by location using RPC function
 * Returns only the fields returned by the RPC function (no photos)
 * Photos should be loaded lazily at the component level
 */
export async function searchPlacesAction(
  params: SearchPlacesParams
): Promise<SearchPlaceInView[]> {
  const supabase = await createClient()
  const { latitude, longitude, radiusKm, limit = 20 } = params

  // Fetch places using RPC function - returns exactly what the RPC returns
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
  const places: SearchPlaceInView[] = placesData.map((place) => ({
    id: place.id,
    country: place.country,
    description: place.description,
    distance_km: place.distance_km,
    lat: place.lat,
    long: place.long,
    name: place.name,
    region: place.region,
    score: place.score,
    source: place.source,
    type: place.type,
    website: place.website,
    wikipedia_query: place.wikipedia_query,
    metadata: place.metadata as Json | undefined,
    // photos will be undefined initially, loaded lazily
    photos: undefined,
  }))

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
