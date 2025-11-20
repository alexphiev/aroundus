import { PostgrestSingleResponse } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { supabase } from './supabase'
import { Tables } from '@/types/supabase'

export type Source = Tables<'sources'>

/**
 * Get or create a source by URL (ensures uniqueness by URL)
 * @param url The source URL
 * @returns The source object, either existing or newly created
 */
export async function getOrCreateSource(url: string): Promise<PostgrestSingleResponse<Source>> {
  // First, try to find existing source by URL
  const { data: existing, error: findError } = await supabase.from('sources').select('*').eq('url', url).single()

  if (existing && !findError) {
    console.log(`✅ Found existing source: ${url}`)
    return { data: existing, error: null } as PostgrestSingleResponse<Source>
  }

  // If not found, create a new source
  // Generate UUID explicitly since database may not have default
  console.log(`📝 Creating new source: ${url}`)
  const { data, error } = await supabase
    .from('sources')
    .insert({
      id: randomUUID(),
      url,
    })
    .select()
    .single()

  if (error) {
    console.error(`❌ Error creating source:`, error)
    return { data: null, error } as PostgrestSingleResponse<Source>
  }

  return { data, error: null } as PostgrestSingleResponse<Source>
}

/**
 * Get a source by ID
 */
export async function getSourceById(id: string): Promise<PostgrestSingleResponse<Source>> {
  return supabase.from('sources').select('*').eq('id', id).single()
}

/**
 * Update a source
 */
export async function updateSource(id: string, updates: Partial<Source>): Promise<PostgrestSingleResponse<Source>> {
  return supabase
    .from('sources')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}
