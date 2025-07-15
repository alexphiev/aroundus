// Search query types for search history (simplified)
export interface SearchQuery {
  activity: string
  when: string // "today", "tomorrow", "this_weekend", or ISO date string for custom
  specialCare?: 'children' | 'lowMobility' | 'dogs' | 'other'
  otherSpecialCare?: string
  distance: string // Now uses readable text like "1 hour", "30 minutes"
  activityLevel: number
  activityDurationValue: number
  activityDurationUnit: 'hours' | 'days'
  location: {
    latitude: number
    longitude: number
  }
  locationName?: string // Human-readable location name (e.g., "Paris, France")
  additionalInfo?: string // User's direct input from homepage search
  transportType?: 'foot' | 'bike' | 'public_transport' | 'car' // Transport mode
}

// Search result item type
export interface SearchResult {
  name: string
  description: string
  lat: number
  long: number
  landscape?: string
  activity?: string
  estimatedActivityDuration?: string
  estimatedTransportTime?: string
  starRating?: number
  bestTimeToVisit?: string
  timeToAvoid?: string
}

// Database search history record
export interface SearchHistoryRecord {
  id: string
  user_id: string | null
  query: SearchQuery
  results: SearchResult[]
  created_at: string
  updated_at: string | null
  // Search session metadata
  current_batch?: number
  has_more_results?: boolean
  total_results_loaded?: number
  title?: string
}

// API response types
export interface SearchHistoryResponse {
  success?: boolean
  data?: SearchHistoryRecord | SearchHistoryRecord[] | null
  error?: string
}

export interface SaveSearchResponse {
  success?: boolean
  data?: SearchHistoryRecord
  error?: string
}

// Form values for simplified approach
export interface FormValues {
  // Location selection fields
  locationType: 'current' | 'custom'
  customLocation?: {
    name: string
    lat: number
    lng: number
  }

  // Existing fields
  activity: string
  otherActivity?: string
  when: string // "today", "tomorrow", "this_weekend", or ISO date string for custom
  customDate?: Date
  specialCare?: 'children' | 'lowMobility' | 'dogs' | 'other'
  otherSpecialCare?: string
  distance: string // Now uses readable text like "1 hour", "30 minutes"
  transportType: 'foot' | 'bike' | 'public_transport' | 'car'
  activityLevel: number
  activityDurationValue: number
  activityDurationUnit: 'hours' | 'days'
  additionalInfo?: string // User's direct input from homepage search
  locationName?: string // Human-readable location name (e.g., "Paris, France")
}
