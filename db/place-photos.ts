import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Tables } from '@/types/supabase'

export type PlacePhoto = Tables<'place_photos'>

export interface CreatePlacePhotoInput {
  place_id: string
  source: 'wikimedia' | 'google_places'
  url: string
  attribution?: string | null
  is_primary?: boolean
}

/**
 * Get all photos for a place
 */
export async function getPlacePhotos(placeId: string): Promise<PostgrestResponse<PlacePhoto>> {
  return supabase
    .from('place_photos')
    .select('*')
    .eq('place_id', placeId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
}

/**
 * Get primary photo for a place
 */
export async function getPrimaryPhoto(placeId: string): Promise<PostgrestSingleResponse<PlacePhoto>> {
  return supabase.from('place_photos').select('*').eq('place_id', placeId).eq('is_primary', true).single()
}

/**
 * Create a new photo for a place
 */
export async function createPlacePhoto(photo: CreatePlacePhotoInput): Promise<PostgrestSingleResponse<PlacePhoto>> {
  return supabase.from('place_photos').insert(photo).select().single()
}

/**
 * Create multiple photos for a place in batch
 */
export async function createPlacePhotos(photos: CreatePlacePhotoInput[]): Promise<PostgrestResponse<PlacePhoto>> {
  if (photos.length === 0) {
    return { data: [], error: null } as unknown as PostgrestResponse<PlacePhoto>
  }

  return supabase.from('place_photos').insert(photos).select()
}

/**
 * Set a photo as primary (and unset others)
 */
export async function setPrimaryPhoto(placeId: string, photoId: string): Promise<PostgrestResponse<PlacePhoto>> {
  // First, unset all primary photos for this place
  await supabase.from('place_photos').update({ is_primary: false }).eq('place_id', placeId).eq('is_primary', true)

  // Then set the new primary photo
  return supabase.from('place_photos').update({ is_primary: true }).eq('id', photoId).eq('place_id', placeId).select()
}

/**
 * Check if place has any photos
 */
export async function hasPlacePhotos(placeId: string): Promise<boolean> {
  const { data, error } = await supabase.from('place_photos').select('id').eq('place_id', placeId).limit(1)

  if (error) {
    console.error('❌ Error checking place photos:', error)
    return false
  }

  return (data?.length || 0) > 0
}
