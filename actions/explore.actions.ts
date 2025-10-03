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

  // Fetch quality scores for the places
  const placeIds = data.map((place) => place.id)
  const { data: qualityData, error: qualityError } = await supabase
    .from('places')
    .select('id, score')
    .in('id', placeIds)

  if (qualityError) {
    console.warn('Failed to fetch quality data:', qualityError)
    // Fallback to default quality if can't fetch
    return data.map((place) => ({ ...place, quality: 0 }))
  }

  // Create quality map
  const qualityMap = new Map()
  qualityData?.forEach((place) => {
    qualityMap.set(place.id, place.score || 0)
  })

  // Combine data with quality scores
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
