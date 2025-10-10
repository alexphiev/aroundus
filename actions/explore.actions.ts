'use server'

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
  id: string
  name: string
  description: string
  source: string
  type: string
  lat: number
  long: number
  quality: number
  metadata?: {
    tags?: Record<string, string>
  }
}

export async function getPlacesInBounds(
  bounds: BoundingBox
): Promise<PlacesInView[]> {
  const supabase = await createClient()

  // Use PostGIS spatial query via RPC function to get basic place data
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

  if (!data || data.length === 0) {
    return []
  }

  const placeIds = data.map((place) => place.id)
  const { data: qualityData, error: qualityError } = await supabase
    .from('places')
    .select('id, score')
    .in('id', placeIds)

  if (qualityError) {
    console.warn('Failed to fetch quality data:', qualityError)
    return data.map((place) => ({ ...place, quality: 0 }))
  }

  const qualityMap = new Map()
  qualityData?.forEach((place) => {
    qualityMap.set(place.id, place.score || 0)
  })

  return data.map((place) => ({
    ...place,
    quality: qualityMap.get(place.id) || 0,
  }))
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
    data?.map((place) => ({
      id: place.id,
      name: place.name || '',
      type: place.type || '',
      geometry: place.geometry as GeoJSONGeometry,
    })) || []
  )
}
