interface NominatimSearchResult {
  place_id: string
  display_name: string
  lat: string
  lon: string
  address?: {
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
  type: string
  importance: number
}

export interface LocationSuggestion {
  id: string
  name: string
  displayName: string
  lat: number
  lng: number
  type: string
  importance: number
  region?: string
  country?: string
}

// Simple in-memory cache for autocomplete results
const autocompleteCache = new Map<
  string,
  { data: LocationSuggestion[]; timestamp: number }
>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes for autocomplete

// Rate limiting
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000 // 1 second as per Nominatim policy

/**
 * Search for locations using Nominatim API
 * Returns up to 5 suggestions with proper formatting
 */
export async function searchLocations(
  query: string
): Promise<LocationSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  const trimmedQuery = query.trim()
  const cacheKey = trimmedQuery.toLowerCase()

  // Check cache first
  const cached = autocompleteCache.get(cacheKey)
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
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', trimmedQuery)
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', '5')
    url.searchParams.set('accept-language', 'en')
    // Exclude very specific address types to focus on places/areas
    url.searchParams.set('exclude_place_ids', '')

    lastRequestTime = Date.now()

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Around Us Nature Discovery App (contact@aroundus.app)',
      },
    })

    if (!response.ok) {
      console.error(
        'Nominatim search API error:',
        response.status,
        response.statusText
      )
      return []
    }

    const data: NominatimSearchResult[] = await response.json()

    if (!Array.isArray(data)) {
      console.error('Unexpected Nominatim response format')
      return []
    }

    // Process and format results
    const suggestions: LocationSuggestion[] = data
      .map((result) => formatLocationSuggestion(result))
      .filter(
        (suggestion): suggestion is LocationSuggestion => suggestion !== null
      )
      .slice(0, 5) // Ensure we don't exceed 5 results

    // Cache the results
    autocompleteCache.set(cacheKey, {
      data: suggestions,
      timestamp: Date.now(),
    })

    return suggestions
  } catch (error) {
    console.error('Location search failed:', error)
    return []
  }
}

/**
 * Format a Nominatim result into our LocationSuggestion format
 */
function formatLocationSuggestion(
  result: NominatimSearchResult
): LocationSuggestion | null {
  try {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)

    if (isNaN(lat) || isNaN(lng)) {
      return null
    }

    // Extract region and country information
    const address = result.address
    const region =
      address?.state || address?.province || address?.region || address?.county
    const country = address?.country

    // Create a cleaner display name
    let displayName = result.display_name

    // If the display name is very long, try to shorten it
    if (displayName.length > 60) {
      const parts = displayName.split(', ')
      if (parts.length > 3) {
        displayName = parts.slice(0, 3).join(', ') + '...'
      }
    }

    return {
      id: result.place_id,
      name: extractMainName(result.display_name),
      displayName,
      lat,
      lng,
      type: result.type,
      importance: result.importance,
      region,
      country,
    }
  } catch (error) {
    console.error('Error formatting location suggestion:', error)
    return null
  }
}

/**
 * Extract the main name from a full display name
 * e.g., "New York, New York, United States" -> "New York"
 */
function extractMainName(displayName: string): string {
  const parts = displayName.split(', ')
  return parts[0] || displayName
}

/**
 * Clear the autocomplete cache (useful for testing or memory management)
 */
export function clearAutocompleteCache(): void {
  autocompleteCache.clear()
}

/**
 * Get a formatted location string for display
 */
export function formatLocationDisplay(suggestion: LocationSuggestion): string {
  const parts = [suggestion.name]

  if (suggestion.region && suggestion.region !== suggestion.name) {
    parts.push(suggestion.region)
  }

  if (suggestion.country && suggestion.country !== suggestion.region) {
    parts.push(suggestion.country)
  }

  return parts.join(', ')
}
