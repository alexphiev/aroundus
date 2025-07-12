export interface PlacePhoto {
  url: string
  attribution?: string
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
  whyRecommended?: string
  isOtherCategory?: boolean
  starRating?: number
  bestTimeToVisit?: string
  timeToAvoid?: string
  // Enhanced location data from Google Search
  googleMapsLink?: string
  operatingHours?: string
  entranceFee?: string
  parkingInfo?: string
  currentConditions?: string
  created_at?: string
  // User feedback for place recommendations
  userFeedback?: 'liked' | 'disliked' | null
  // Google Places data
  photos?: PlacePhoto[]
  reviews?: PlaceReview[]
  googleRating?: number
  reviewCount?: number
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
