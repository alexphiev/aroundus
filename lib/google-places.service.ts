interface GooglePlace {
  id: string
  displayName?: {
    text: string
  }
  photos?: Array<{
    name: string
    authorAttributions?: Array<{
      displayName: string
      uri?: string
    }>
  }>
  reviews?: Array<{
    name: string
    rating: number
    text?: {
      text: string
    }
    authorAttribution?: {
      displayName: string
      photoUri?: string
    }
    publishTime: string
  }>
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  regularOpeningHours?: {
    openNow?: boolean
    periods?: Array<{
      open: {
        day: number
        hour: number
        minute: number
      }
      close?: {
        day: number
        hour: number
        minute: number
      }
    }>
    weekdayDescriptions?: string[]
  }
  priceLevel?:
    | 'PRICE_LEVEL_FREE'
    | 'PRICE_LEVEL_INEXPENSIVE'
    | 'PRICE_LEVEL_MODERATE'
    | 'PRICE_LEVEL_EXPENSIVE'
    | 'PRICE_LEVEL_VERY_EXPENSIVE'
  accessibilityOptions?: {
    wheelchairAccessibleParking?: boolean
    wheelchairAccessibleEntrance?: boolean
    wheelchairAccessibleRestroom?: boolean
    wheelchairAccessibleSeating?: boolean
  }
  parkingOptions?: {
    freeParking?: boolean
    paidParking?: boolean
    freeStreetParking?: boolean
    paidStreetParking?: boolean
    freeGarageParking?: boolean
    paidGarageParking?: boolean
  }
}

interface GooglePlacesSearchResponse {
  places: GooglePlace[]
}

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

export interface GooglePlacesData {
  photos: PlacePhoto[]
  reviews: PlaceReview[]
  googleRating?: number
  reviewCount?: number
  googleMapsUri?: string
  operatingHours?: string
  priceLevel?: string
  parkingInfo?: string
  accessibilityInfo?: string
  displayName?: string
}

// Simple in-memory cache for Google Places data
const placesCache = new Map<
  string,
  { data: GooglePlacesData; timestamp: number }
>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Search for a place using Google Places API to get place_id
 */
async function searchPlaceId(
  name: string,
  lat: number,
  lng: number
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error('Google Places API key not configured')
    return null
  }

  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName',
        },
        body: JSON.stringify({
          textQuery: name,
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: 50000, // 50km radius
            },
          },
          maxResultCount: 1,
        }),
      }
    )

    if (!response.ok) {
      console.error('Google Places search failed:', response.statusText)
      return null
    }

    const data: GooglePlacesSearchResponse = await response.json()
    return data.places?.[0]?.id || null
  } catch (error) {
    console.error('Error searching for place:', error)
    return null
  }
}

/**
 * Get photos for a place using Google Places API
 */
async function getPlacePhotos(placeId: string): Promise<PlacePhoto[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error('Google Places API key not configured')
    return []
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'photos',
        },
      }
    )

    if (!response.ok) {
      console.error('Google Places details failed:', response.statusText)
      return []
    }

    const data: GooglePlace = await response.json()
    if (!data.photos) return []

    // Convert photo references to URLs and extract attributions
    const photos: PlacePhoto[] = []

    for (const photo of data.photos.slice(0, 5)) {
      // Limit to 5 photos
      const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&key=${apiKey}`

      const attribution = photo.authorAttributions?.[0]
        ? photo.authorAttributions[0].displayName
        : undefined

      photos.push({
        url: photoUrl,
        attribution,
      })
    }

    return photos
  } catch (error) {
    console.error('Error fetching place photos:', error)
    return []
  }
}

/**
 * Get reviews and practical info for a place using Google Places API
 */
async function getPlaceDetailsAndReviews(placeId: string): Promise<{
  reviews: PlaceReview[]
  googleRating?: number
  reviewCount?: number
  googleMapsUri?: string
  operatingHours?: string
  priceLevel?: string
  parkingInfo?: string
  accessibilityInfo?: string
  displayName?: string
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error('Google Places API key not configured')
    return { reviews: [] }
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'displayName,reviews,rating,userRatingCount,googleMapsUri,regularOpeningHours,priceLevel,accessibilityOptions,parkingOptions',
        },
      }
    )

    if (!response.ok) {
      console.error('Google Places reviews failed:', response.statusText)
      return { reviews: [] }
    }

    const data: GooglePlace = await response.json()

    const reviews: PlaceReview[] = []

    if (data.reviews) {
      for (const review of data.reviews.slice(0, 5)) {
        // Limit to 5 reviews
        reviews.push({
          author: review.authorAttribution?.displayName || 'Anonymous',
          rating: review.rating,
          text: review.text?.text || '',
          publishTime: review.publishTime,
          authorPhotoUrl: review.authorAttribution?.photoUri,
        })
      }
    }

    // Process opening hours
    let operatingHours: string | undefined
    if (data.regularOpeningHours?.weekdayDescriptions) {
      operatingHours = data.regularOpeningHours.weekdayDescriptions.join('\n')
    } else if (data.regularOpeningHours?.openNow !== undefined) {
      operatingHours = data.regularOpeningHours.openNow
        ? 'Currently open'
        : 'Currently closed'
    }

    // Process price level
    let priceLevel: string | undefined
    if (data.priceLevel) {
      const priceLevelMap = {
        PRICE_LEVEL_FREE: 'Free',
        PRICE_LEVEL_INEXPENSIVE: 'Inexpensive ($)',
        PRICE_LEVEL_MODERATE: 'Moderate ($$)',
        PRICE_LEVEL_EXPENSIVE: 'Expensive ($$$)',
        PRICE_LEVEL_VERY_EXPENSIVE: 'Very Expensive ($$$$)',
      }
      priceLevel = priceLevelMap[data.priceLevel] || data.priceLevel
    }

    // Process parking info
    let parkingInfo: string | undefined
    if (data.parkingOptions) {
      const parkingDetails = []
      if (data.parkingOptions.freeParking)
        parkingDetails.push('Free parking available')
      if (data.parkingOptions.paidParking)
        parkingDetails.push('Paid parking available')
      if (data.parkingOptions.freeStreetParking)
        parkingDetails.push('Free street parking')
      if (data.parkingOptions.paidStreetParking)
        parkingDetails.push('Paid street parking')
      if (data.parkingOptions.freeGarageParking)
        parkingDetails.push('Free garage parking')
      if (data.parkingOptions.paidGarageParking)
        parkingDetails.push('Paid garage parking')
      if (parkingDetails.length > 0) {
        parkingInfo = parkingDetails.join(', ')
      }
    }

    // Process accessibility info
    let accessibilityInfo: string | undefined
    if (data.accessibilityOptions) {
      const accessibilityDetails = []
      if (data.accessibilityOptions.wheelchairAccessibleEntrance)
        accessibilityDetails.push('Wheelchair accessible entrance')
      if (data.accessibilityOptions.wheelchairAccessibleParking)
        accessibilityDetails.push('Wheelchair accessible parking')
      if (data.accessibilityOptions.wheelchairAccessibleRestroom)
        accessibilityDetails.push('Wheelchair accessible restroom')
      if (data.accessibilityOptions.wheelchairAccessibleSeating)
        accessibilityDetails.push('Wheelchair accessible seating')
      if (accessibilityDetails.length > 0) {
        accessibilityInfo = accessibilityDetails.join(', ')
      }
    }

    return {
      reviews,
      googleRating: data.rating,
      reviewCount: data.userRatingCount,
      googleMapsUri: data.googleMapsUri,
      operatingHours,
      priceLevel,
      parkingInfo,
      accessibilityInfo,
      displayName: data.displayName?.text,
    }
  } catch (error) {
    console.error('Error fetching place reviews:', error)
    return { reviews: [] }
  }
}

/**
 * Enrich a place with Google Photos and Reviews
 */
export async function enrichPlaceWithGoogleData(
  placeName: string,
  lat: number,
  lng: number
): Promise<GooglePlacesData> {
  // Check cache first
  const cacheKey = `${placeName}_${lat.toFixed(4)}_${lng.toFixed(4)}`
  const cached = placesCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // First, find the place_id
    const placeId = await searchPlaceId(placeName, lat, lng)
    if (!placeId) {
      const emptyData: GooglePlacesData = { photos: [], reviews: [] }
      return emptyData
    }

    // Fetch photos and details in parallel
    const [photos, detailsData] = await Promise.all([
      getPlacePhotos(placeId),
      getPlaceDetailsAndReviews(placeId),
    ])

    const googleData: GooglePlacesData = {
      photos,
      reviews: detailsData.reviews,
      googleRating: detailsData.googleRating,
      reviewCount: detailsData.reviewCount,
      googleMapsUri: detailsData.googleMapsUri,
      operatingHours: detailsData.operatingHours,
      priceLevel: detailsData.priceLevel,
      parkingInfo: detailsData.parkingInfo,
      accessibilityInfo: detailsData.accessibilityInfo,
      displayName: detailsData.displayName,
    }

    // Cache the result
    placesCache.set(cacheKey, {
      data: googleData,
      timestamp: Date.now(),
    })

    return googleData
  } catch (error) {
    console.error('Error enriching place with Google data:', error)
    return { photos: [], reviews: [] }
  }
}

/**
 * Clear the places cache (useful for testing or memory management)
 */
export function clearPlacesCache(): void {
  placesCache.clear()
}
