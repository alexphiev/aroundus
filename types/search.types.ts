import { Database } from '@/types/supabase'

/**
 * Photo structure from place_photos table
 */
export interface SearchPlacePhoto {
  id: string
  url: string
  attribution: string | null
  is_primary: boolean | null
  source: string
}

/**
 * Supabase generated type from search_places_by_location RPC function
 * This ensures type safety and stays in sync with the database schema
 */
export type SearchPlaceByLocation =
  Database['public']['Functions']['search_places_by_location']['Returns'][number]

/**
 * Place structure for search page - extends SearchPlaceByLocation with photos
 * Photos are loaded lazily at the component level
 */
export interface SearchPlaceInView extends SearchPlaceByLocation {
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
