export interface NominatimResponse {
  display_name: string
  address: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    province?: string
    region?: string
    country?: string
  }
  error?: string
}

export interface LocationInfo {
  locationName: string
  city?: string
  region?: string
  country?: string
  // Store the original response for detailed address info
  fullResponse?: NominatimResponse
}

// Simple in-memory cache for geocoding results
const geocodeCache = new Map<
  string,
  { data: LocationInfo; timestamp: number }
>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Rate limiting
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000 // 1 second as per Nominatim policy

/**
 * Reverse geocode coordinates to get location information
 * Uses Nominatim API with proper rate limiting and caching
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationInfo | null> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`

  // Check cache first
  const cached = geocodeCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  // Rate limiting - ensure at least 1 second between requests
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    )
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('lat', latitude.toString())
    url.searchParams.set('lon', longitude.toString())
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('accept-language', 'en')

    lastRequestTime = Date.now()

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Around Us Nature Discovery App (contact@aroundus.app)',
      },
    })

    if (!response.ok) {
      return null
    }

    const data: NominatimResponse = await response.json()

    if (data.error) {
      return null
    }

    // Extract meaningful location information
    const locationInfo = extractLocationInfo(data)

    // Cache the result
    geocodeCache.set(cacheKey, {
      data: locationInfo,
      timestamp: Date.now(),
    })

    return locationInfo
  } catch (error) {
    console.error('🔧 Geocoding: Reverse geocoding failed:', error)
    return null
  }
}

/**
 * Extract meaningful location information from Nominatim response
 * Prioritizes city/town, then region/state, then country
 */
function extractLocationInfo(data: NominatimResponse): LocationInfo {
  const { address } = data

  // Find the best city name
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    undefined

  // Find the best region name
  const region =
    address.state || address.province || address.region || address.county

  const country = address.country

  // Create a human-readable location name
  let locationName = ''
  if (city && region) {
    locationName = `${city}, ${region}`
  } else if (city) {
    locationName = city
  } else if (region) {
    locationName = region
  } else if (country) {
    locationName = country
  } else {
    locationName = 'Unknown location'
  }

  return {
    locationName,
    city,
    region,
    country,
    fullResponse: data,
  }
}

/**
 * Get a simple location string for display purposes
 */
export function getLocationDisplayName(locationInfo: LocationInfo): string {
  return locationInfo.locationName
}

/**
 * Clear the geocoding cache (useful for testing or memory management)
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear()
}
