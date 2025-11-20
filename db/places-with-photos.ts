import { supabase } from './supabase'
import { PlacePhoto } from './place-photos'
import { PlaceWithPhotos } from './places'

/**
 * Get multiple places by IDs with photos included (using nested select for efficiency)
 */
export async function getPlacesByIdsWithPhotos(ids: string[]): Promise<PlaceWithPhotos[]> {
  if (ids.length === 0) {
    return []
  }

  const { data: places, error } = await supabase.from('places').select('*, place_photos(*)').in('id', ids)

  if (error || !places) {
    console.error('Error fetching places with photos:', error)
    return []
  }

  return places as PlaceWithPhotos[]
}

/**
 * Fetch photos for multiple place IDs and return a map of place_id -> photos[]
 * Useful for attaching photos to search results from database functions
 */
export async function getPhotosForPlaceIds(placeIds: string[]): Promise<Map<string, PlacePhoto[]>> {
  if (placeIds.length === 0) {
    return new Map()
  }

  const { data: photos, error } = await supabase
    .from('place_photos')
    .select('*')
    .in('place_id', placeIds)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching photos:', error)
    return new Map()
  }

  // Group photos by place_id
  const photosByPlaceId = new Map<string, PlacePhoto[]>()
  if (photos) {
    for (const photo of photos) {
      const placeId = photo.place_id
      if (!photosByPlaceId.has(placeId)) {
        photosByPlaceId.set(placeId, [])
      }
      photosByPlaceId.get(placeId)!.push(photo)
    }
  }

  return photosByPlaceId
}

/**
 * Attach photos to places fetched from database functions (like search_places_by_location)
 * This is useful when you get places from PostgreSQL functions that don't include photos
 */
export async function attachPhotosToPlaces<T extends { id: string }>(
  places: T[],
): Promise<Array<T & { photos?: PlacePhoto[] }>> {
  if (places.length === 0) {
    return []
  }

  const placeIds = places.map((p) => p.id)
  const photosMap = await getPhotosForPlaceIds(placeIds)

  return places.map((place) => ({
    ...place,
    photos: photosMap.get(place.id) || [],
  }))
}
