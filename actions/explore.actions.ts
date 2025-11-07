'use server'

import { Json } from '@/types/supabase'
import { createClient } from '@/utils/supabase/server'

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

export interface GeoJSONGeometry {
  type:
    | 'Point'
    | 'LineString'
    | 'Polygon'
    | 'MultiPoint'
    | 'MultiLineString'
    | 'MultiPolygon'
  coordinates: number[] | number[][] | number[][][]
}

export interface PlacesInView {
  country: string
  description: string
  distance_km: number
  id: string
  lat: number
  long: number
  name: string
  region: string
  score: number
  source: string
  type: string
  website: string
  wikipedia_query: string
  metadata?: Json
  photos?: {
    url: string
    caption: string
  }[]
}

export async function getPlacesInBounds(
  bounds: BoundingBox
): Promise<PlacesInView[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_places_in_view', {
    min_lat: bounds.south,
    min_long: bounds.west,
    max_lat: bounds.north,
    max_long: bounds.east,
    max_results: 100,
    min_score: 3,
  })

  if (error) {
    console.error('PostGIS spatial query error:', error)
    throw new Error('Failed to fetch places from database')
  }

  return data
}

export async function getPlaceGeometry(
  placeId: string
): Promise<GeoJSONGeometry | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('places')
    .select('geometry')
    .eq('id', placeId)
    .not('geometry', 'is', null)
    .single()

  if (error) {
    console.warn('Failed to fetch geometry data:', error)
    return null
  }

  return (data?.geometry as GeoJSONGeometry) || null
}

export async function getPlaceMetadata(placeId: string): Promise<{
  tags?: Record<string, string>
  score?: number
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('places')
    .select('metadata, score')
    .eq('id', placeId)
    .single()

  if (error) {
    console.warn('Failed to fetch metadata:', error)
    return null
  }

  return {
    tags:
      (data?.metadata as { tags?: Record<string, string> })?.tags || undefined,
    score: data?.score,
  }
}

export interface ParkGeometry {
  id: string
  name: string
  type: string
  geometry: GeoJSONGeometry
}

export async function getAllParkGeometries(): Promise<ParkGeometry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('places')
    .select('id, name, type, geometry')
    .in('type', ['national_park', 'regional_park'])
    .not('geometry', 'is', null)

  if (error) {
    console.error('Failed to fetch park geometries:', error)
    return []
  }

  return (
    data?.map(
      (place: {
        id: string
        name: string | null
        type: string | null
        geometry: unknown
      }) => ({
        id: place.id,
        name: place.name || '',
        type: place.type || '',
        geometry: place.geometry as GeoJSONGeometry,
      })
    ) || []
  )
}
