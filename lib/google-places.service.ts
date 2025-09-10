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
  placeId?: string
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
 * Optimized function to get all place data in a single API call
 */
async function getPlaceDataOptimized(placeId: string): Promise<{
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
}> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error('Google Places API key not configured')
    return { photos: [], reviews: [] }
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'id,displayName,photos,reviews,rating,userRatingCount,googleMapsUri,regularOpeningHours.weekdayDescriptions,priceLevel,parkingOptions,accessibilityOptions',
        },
      }
    )

    if (!response.ok) {
      console.error(
        'Google Places details request failed:',
        response.statusText
      )
      return { photos: [], reviews: [] }
    }

    const data: GooglePlace = await response.json()

    // Process photos
    const photos: PlacePhoto[] = []
    if (data.photos) {
      for (const photo of data.photos.slice(0, 5)) {
        const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&key=${apiKey}`
        const attribution = photo.authorAttributions?.[0]
          ? photo.authorAttributions[0].displayName
          : undefined
        photos.push({ url: photoUrl, attribution })
      }
    }

    // Process reviews
    const reviews: PlaceReview[] = []
    if (data.reviews) {
      for (const review of data.reviews.slice(0, 5)) {
        const publishTime = review.publishTime || ''
        const authorPhotoUrl = review.authorAttribution?.photoUri
        reviews.push({
          author: review.authorAttribution?.displayName || 'Anonymous',
          rating: review.rating || 0,
          text: review.text?.text || '',
          publishTime,
          authorPhotoUrl,
        })
      }
    }

    // Process operating hours
    let operatingHours: string | undefined
    if (data.regularOpeningHours?.weekdayDescriptions) {
      operatingHours = data.regularOpeningHours.weekdayDescriptions.join('\n')
    }

    // Process price level
    let priceLevel: string | undefined
    if (data.priceLevel) {
      const priceLevelMap = {
        PRICE_LEVEL_FREE: 'Free',
        PRICE_LEVEL_INEXPENSIVE: 'Inexpensive ($)',
        PRICE_LEVEL_MODERATE: 'Moderate ($$)',
        PRICE_LEVEL_EXPENSIVE: 'Expensive ($$$)',
        PRICE_LEVEL_VERY_EXPENSIVE: 'Very expensive ($$$$)',
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
      photos,
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
    console.error('Error fetching optimized place data:', error)
    return { photos: [], reviews: [] }
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
  const enrichmentStartTime = performance.now()
  console.log(`🏠 Starting Google Places enrichment for: ${placeName}`)

  // Check cache first
  const cacheKey = `${placeName}_${lat.toFixed(4)}_${lng.toFixed(4)}`
  const cached = placesCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    const enrichmentEndTime = performance.now()
    console.log(
      `⚡ Cache hit for ${placeName} - took ${Math.round(enrichmentEndTime - enrichmentStartTime)}ms`
    )
    return cached.data
  }

  try {
    // First, find the place_id
    const searchStartTime = performance.now()
    const placeId = await searchPlaceId(placeName, lat, lng)
    const searchEndTime = performance.now()
    console.log(
      `🔍 Google Places search for place ID took ${Math.round(searchEndTime - searchStartTime)}ms`
    )

    if (!placeId) {
      const enrichmentEndTime = performance.now()
      console.log(
        `❌ No place ID found for ${placeName} - took ${Math.round(enrichmentEndTime - enrichmentStartTime)}ms`
      )
      const emptyData: GooglePlacesData = { photos: [], reviews: [] }
      return emptyData
    }

    // Fetch all place data in a single optimized API call
    const detailsStartTime = performance.now()
    const combinedData = await getPlaceDataOptimized(placeId)
    const detailsEndTime = performance.now()
    console.log(
      `🚀 Optimized Google Places data fetch took ${Math.round(detailsEndTime - detailsStartTime)}ms`
    )

    const { photos, ...detailsData } = combinedData

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
      placeId,
    }

    // Cache the result
    placesCache.set(cacheKey, {
      data: googleData,
      timestamp: Date.now(),
    })

    const enrichmentEndTime = performance.now()
    console.log(
      `✅ Google Places enrichment for ${placeName} completed - total time: ${Math.round(enrichmentEndTime - enrichmentStartTime)}ms`
    )

    return googleData
  } catch (error) {
    const enrichmentEndTime = performance.now()
    console.error(
      `❌ Error enriching place ${placeName} with Google data (took ${Math.round(enrichmentEndTime - enrichmentStartTime)}ms):`,
      error
    )
    return { photos: [], reviews: [] }
  }
}

/**
 * Clear the places cache (useful for testing or memory management)
 */
export function clearPlacesCache(): void {
  placesCache.clear()
}
