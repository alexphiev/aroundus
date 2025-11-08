import { Json } from '@/types/supabase'

/**
 * Photo structure from place_photos table
 */
export interface SearchPlacePhoto {
  id: string
  url: string
  attribution: string | null
  is_primary: boolean | null
}

/**
 * Place structure for search page with photos from place_photos table
 */
export interface SearchPlaceInView {
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
  photos?: SearchPlacePhoto[]
}

/**
 * Search filters for the search page
 */
export interface SearchFilters {
  distance: string
  transportType: 'public_transport' | 'car' | 'foot' | 'bike'
  activity?: string
  locationName?: string
}

/**
 * Search form values (re-exported from validation)
 */
export type { SearchFormValues } from '@/validation/search-form.validation'
