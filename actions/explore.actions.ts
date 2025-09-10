'use server'

import { createClient } from '@/utils/supabase/server'

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

export interface PlacesInView {
  id: string
  name: string
  description: string
  source: string
  type: string
  lat: number
  long: number
}

export async function getPlacesInBounds(
  bounds: BoundingBox
): Promise<PlacesInView[]> {
  const supabase = await createClient()

  // Use PostGIS spatial query via RPC function
  const { data, error } = await supabase.rpc('places_in_view', {
    min_lat: bounds.south,
    min_long: bounds.west,
    max_lat: bounds.north,
    max_long: bounds.east,
  })

  if (error) {
    console.error('PostGIS spatial query error:', error)
    throw new Error('Failed to fetch places from database')
  }

  return data || []
}
