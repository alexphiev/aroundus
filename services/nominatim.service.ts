import { OSM_SUPPORTED_TAGS } from '@/data/osm.data'

interface BoundingBox {
  south: number
  west: number
  north: number
  east: number
}

interface NominatimResult {
  place_id: number
  osm_type: 'node' | 'way' | 'relation'
  osm_id: number
  lat: string
  lon: string
  display_name: string
  class?: string
  type?: string
  extratags?: Record<string, string>
  namedetails?: Record<string, string>
}

export interface NominatimSearchResult {
  naturePlaces: Array<{ type: 'node' | 'way' | 'relation'; id: number; name: string }>
  hasAnyResults: boolean
}

export class NominatimService {
  /**
   * Search for a place by name using Nominatim API
   * Returns OSM IDs and basic info for nature-related places
   * Also indicates if Nominatim found any results (even if none were nature places)
   */
  public async searchPlaceByName(placeName: string, bbox?: BoundingBox): Promise<NominatimSearchResult> {
    const baseUrl = 'https://nominatim.openstreetmap.org/search'
    const params = new URLSearchParams({
      q: placeName,
      format: 'json',
      limit: '10',
      addressdetails: '1',
      extratags: '1',
      namedetails: '1',
    })

    // Add bounding box if provided
    if (bbox) {
      params.append('viewbox', `${bbox.west},${bbox.north},${bbox.east},${bbox.south}`)
      params.append('bounded', '1')
    } else {
      // Default to France
      params.append('countrycodes', 'fr')
    }

    const url = `${baseUrl}?${params.toString()}`

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'empreinte-backend/1.0.0',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout for Nominatim
      })

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`)
      }

      const results = (await response.json()) as NominatimResult[]

      // Filter to only include nature-related places
      const natureResults = results.filter((result) => {
        const tags = { ...result.extratags, class: result.class, type: result.type }
        return this.isNaturePlace(tags)
      })

      // Extract OSM IDs and names for nature places
      const naturePlaces = natureResults.map((result) => {
        const name = result.namedetails?.name || result.extratags?.name || result.display_name.split(',')[0].trim()
        return {
          type: result.osm_type,
          id: result.osm_id,
          name,
        }
      })

      return {
        naturePlaces,
        hasAnyResults: results.length > 0,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('Nominatim request timeout')
      }
      throw error
    }
  }

  /**
   * Check if a place is a nature place based on Nominatim tags
   * Nominatim uses 'class' and 'type' fields, plus extratags
   */
  private isNaturePlace(tags: Record<string, string | undefined>): boolean {
    const classValue = tags.class
    const typeValue = tags.type

    // Check if class/type combination matches our supported nature tags
    if (classValue && typeValue) {
      // Check if this class/type combination is in our supported tags
      if (OSM_SUPPORTED_TAGS[classValue] && OSM_SUPPORTED_TAGS[classValue].includes(typeValue)) {
        return true
      }
    }

    // Also check extratags for OSM tag keys
    for (const [tagKey, tagValues] of Object.entries(OSM_SUPPORTED_TAGS)) {
      const tagValue = tags[tagKey]
      if (tagValue && tagValues.includes(tagValue)) {
        return true
      }
    }

    return false
  }
}

export const nominatimService = new NominatimService()
