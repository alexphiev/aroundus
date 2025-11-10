export interface PlacePhoto {
  url: string
  attribution?: string
  source?: string
}

export interface PlaceReview {
  author: string
  rating: number
  text: string
  publishTime: string
  authorPhotoUrl?: string
}

export interface PlaceResultItem {
  id?: string
  name: string
  description: string
  lat: number
  long: number
  landscape?:
    | 'mountain'
    | 'forest'
    | 'lake'
    | 'beach'
    | 'river'
    | 'park'
    | 'wetland'
    | 'desert'
    | string
  activity?:
    | 'hiking'
    | 'biking'
    | 'camping'
    | 'photography'
    | 'wildlife'
    | 'walking'
    | 'swimming'
    | string
  estimatedActivityDuration?: string
  estimatedTransportTime?: string
  transportMode?: 'foot' | 'bike' | 'public_transport' | 'car'
  isOtherCategory?: boolean
  starRating?: number
  starRatingReason?: string
  bestTimeToVisit?: string
  timeToAvoid?: string
  // Enhanced location data from Google Search
  googleMapsLink?: string
  operatingHours?: string
  entranceFee?: string
  parkingInfo?: string
  accessibilityInfo?: string
  currentConditions?: string
  created_at?: string
  // User feedback for place recommendations
  userFeedback?: 'liked' | 'disliked' | null
  // Google Places data
  photos?: PlacePhoto[]
  reviews?: PlaceReview[]
  googleRating?: number
  reviewCount?: number
  googleMapsUri?: string
  displayName?: string // Google Places display name
  placeId?: string // Google Places place ID
}

// Minimal place context for optimized search iterations
export interface MinimalPlaceContext {
  name: string
  lat: number
  long: number
  landscape: string
  activity: string
  userFeedback?: 'liked' | 'disliked' | null
}

// User preferences derived from feedback
export interface UserPreferences {
  likedLandscapes: string[]
  dislikedLandscapes: string[]
  likedActivities: string[]
  dislikedActivities: string[]
  likedPlaces: MinimalPlaceContext[]
  dislikedPlaces: MinimalPlaceContext[]
}

// Optimized search context to replace conversation history
export interface OptimizedSearchContext {
  previousPlaces: MinimalPlaceContext[]
  userPreferences: UserPreferences
  batchNumber: number
}

// Error types for discover actions
export enum DiscoverErrorType {
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  AI_RESPONSE_ERROR = 'AI_RESPONSE_ERROR',
  AI_PARSING_ERROR = 'AI_PARSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  GOOGLE_PLACES_ERROR = 'GOOGLE_PLACES_ERROR',
  WEATHER_ERROR = 'WEATHER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface DiscoverError {
  type: DiscoverErrorType
  message: string
  details?: unknown
  retryable?: boolean
  userFriendlyMessage?: string
}

export interface DiscoverResult<T = unknown> {
  success: boolean
  data?: T
  error?: DiscoverError
  searchContext?: OptimizedSearchContext
  batchNumber?: number
  hasMore?: boolean
  locationName?: string
}
