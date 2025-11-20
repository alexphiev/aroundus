import { PostgrestSingleResponse } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { supabase } from './supabase'
import { Tables } from '@/types/supabase'

export type GeneratedPlace = Tables<'generated_places'>

export interface GeneratedPlaceInput {
  name: string
  description: string | null
  source_id: string
}

/**
 * Get or create a generated place by source_id and name (ensures uniqueness by source_id + name combination)
 * If a place with the same source_id and name exists, update its description
 * @param place The place data to create or update
 * @returns The generated place object
 */
export async function getOrCreateGeneratedPlace(
  place: GeneratedPlaceInput,
): Promise<PostgrestSingleResponse<GeneratedPlace>> {
  // First, try to find existing place by source_id AND name combination
  const { data: existing, error: findError } = await supabase
    .from('generated_places')
    .select('*')
    .eq('source_id', place.source_id)
    .eq('name', place.name)
    .single()

  if (existing && !findError) {
    // Update existing place with new description
    console.log(`🔄 Updating existing generated place: ${place.name} (source: ${place.source_id})`)
    const { data, error } = await supabase
      .from('generated_places')
      .update({
        description: place.description,
        updated_at: new Date().toISOString(),
      })
      .eq('source_id', place.source_id)
      .eq('name', place.name)
      .select()
      .single()

    if (error) {
      console.error(`❌ Error updating generated place:`, error)
      return { data: null, error } as PostgrestSingleResponse<GeneratedPlace>
    }

    return { data, error: null } as PostgrestSingleResponse<GeneratedPlace>
  }

  // If not found, create a new generated place
  // Generate UUID explicitly since database may not have default
  console.log(`📝 Creating new generated place: ${place.name}`)
  const { data, error } = await supabase
    .from('generated_places')
    .insert({
      id: randomUUID(),
      name: place.name,
      description: place.description,
      source_id: place.source_id,
    })
    .select()
    .single()

  if (error) {
    console.error(`❌ Error creating generated place:`, error)
    return { data: null, error } as PostgrestSingleResponse<GeneratedPlace>
  }

  return { data, error: null } as PostgrestSingleResponse<GeneratedPlace>
}

/**
 * Batch create or update generated places
 * @param places Array of places to create or update
 * @returns Array of created/updated places
 */
export async function batchGetOrCreateGeneratedPlaces(places: GeneratedPlaceInput[]): Promise<GeneratedPlace[]> {
  const results: GeneratedPlace[] = []

  for (const place of places) {
    const result = await getOrCreateGeneratedPlace(place)
    if (result.data) {
      results.push(result.data)
    } else if (result.error) {
      console.error(`❌ Failed to create/update place "${place.name}":`, result.error)
    }
  }

  return results
}

/**
 * Get all generated places for a source
 */
export async function getGeneratedPlacesBySourceId(sourceId: string): Promise<GeneratedPlace[]> {
  const { data, error } = await supabase.from('generated_places').select('*').eq('source_id', sourceId)

  if (error) {
    console.error(`❌ Error fetching generated places for source ${sourceId}:`, error)
    return []
  }

  return data || []
}

/**
 * Get all generated places without a status, sorted by oldest created_at first
 * @param limit Optional limit on number of places to return
 */
export async function getGeneratedPlacesWithoutStatus(limit?: number): Promise<GeneratedPlace[]> {
  let query = supabase.from('generated_places').select('*').is('status', null).order('created_at', { ascending: true })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error(`❌ Error fetching generated places without status:`, error)
    return []
  }

  return data || []
}

/**
 * Update a generated place
 */
export async function updateGeneratedPlace(
  id: string,
  updates: Partial<GeneratedPlace>,
): Promise<PostgrestSingleResponse<GeneratedPlace>> {
  return supabase
    .from('generated_places')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

/**
 * Get a generated place by ID
 */
export async function getGeneratedPlaceById(id: string): Promise<PostgrestSingleResponse<GeneratedPlace>> {
  return supabase.from('generated_places').select('*').eq('id', id).single()
}

/**
 * Check if a place has a related generated place (is verified)
 */
export async function hasGeneratedPlace(placeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('generated_places')
    .select('id')
    .eq('place_id', placeId)
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is expected, other errors are real issues
    console.error(`❌ Error checking for generated place:`, error)
    return false
  }

  return !!data
}
