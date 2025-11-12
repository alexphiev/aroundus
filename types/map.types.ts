import { Json } from './supabase'

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
  distance_km?: number // Optional because explore page doesn't always have distance
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
}
