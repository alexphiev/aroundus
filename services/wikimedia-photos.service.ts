interface WikimediaSearchResult {
  query: {
    search: Array<{
      title: string
      pageid: number
    }>
  }
}

interface WikimediaPageResult {
  query: {
    pages: {
      [key: string]: {
        pageid: number
        title: string
        imageinfo?: Array<{
          url: string
          descriptionurl: string
          extmetadata?: {
            Artist?: { value: string }
            Attribution?: { value: string }
            LicenseShortName?: { value: string }
            ImageDescription?: { value: string }
          }
          width?: number
          height?: number
        }>
      }
    }
  }
}

export interface WikimediaPhoto {
  url: string
  attribution: string
  width?: number
  height?: number
}

export class WikimediaPhotosService {
  /**
   * Search for photos of a place using Wikimedia Commons API
   * Uses place name, coordinates, and optionally OSM ID
   */
  public async searchPlacePhotos(
    placeName: string,
    latitude: number | null,
    longitude: number | null,
    osmId?: string | null,
  ): Promise<WikimediaPhoto[]> {
    try {
      console.log(`🔍 Searching Wikimedia Commons for: ${placeName}`)

      // Build search query
      const searchQueries: string[] = [placeName]

      // Add location-based search if coordinates available
      if (latitude !== null && longitude !== null) {
        // Search for nearby images using geosearch
        const nearbyPhotos = await this.searchNearbyPhotos(latitude, longitude)
        if (nearbyPhotos.length > 0) {
          console.log(`✅ Found ${nearbyPhotos.length} nearby photos from geosearch`)
          return nearbyPhotos
        }
      }

      // Try searching by place name
      const namePhotos = await this.searchByPlaceName(placeName, osmId)
      if (namePhotos.length > 0) {
        console.log(`✅ Found ${namePhotos.length} photos by name search`)
        return namePhotos
      }

      console.log(`❌ No photos found for: ${placeName}`)
      return []
    } catch (error) {
      console.error(`❌ Error searching Wikimedia Commons:`, error)
      return []
    }
  }

  /**
   * Search for photos near coordinates using geosearch
   */
  private async searchNearbyPhotos(latitude: number, longitude: number): Promise<WikimediaPhoto[]> {
    try {
      const baseUrl = 'https://commons.wikimedia.org/w/api.php'
      const params = new URLSearchParams({
        action: 'query',
        list: 'geosearch',
        gscoord: `${latitude}|${longitude}`,
        gsradius: '10000', // 10km radius
        gslimit: '50',
        format: 'json',
        origin: '*',
      })

      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: {
          'User-Agent': 'empreinte-backend/1.0.0 (https://github.com/alexphiev/empreinte_backend)',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Wikimedia API error: ${response.status}`)
      }

      const data = (await response.json()) as { query?: { geosearch?: Array<{ pageid: number }> } }

      if (!data.query?.geosearch || data.query.geosearch.length === 0) {
        return []
      }

      // Get image info for the found pages
      const pageIds = data.query.geosearch.map((item) => item.pageid).join('|')
      return await this.getImageInfo(pageIds)
    } catch (error) {
      console.error(`❌ Error in geosearch:`, error)
      return []
    }
  }

  /**
   * Search for photos by place name
   */
  private async searchByPlaceName(placeName: string, osmId?: string | null): Promise<WikimediaPhoto[]> {
    try {
      const baseUrl = 'https://commons.wikimedia.org/w/api.php'

      // Try multiple search strategies
      const searchTerms = [placeName]

      // Add OSM ID-based search if available
      if (osmId) {
        searchTerms.push(`Q${osmId}`) // Wikidata Q ID format (if OSM ID maps to Wikidata)
      }

      for (const searchTerm of searchTerms) {
        const params = new URLSearchParams({
          action: 'query',
          list: 'search',
          srsearch: searchTerm,
          srnamespace: '6', // File namespace
          srlimit: '20',
          format: 'json',
          origin: '*',
        })

        const response = await fetch(`${baseUrl}?${params.toString()}`, {
          headers: {
            'User-Agent': 'empreinte-backend/1.0.0 (https://github.com/alexphiev/empreinte_backend)',
          },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          continue
        }

        const data = (await response.json()) as WikimediaSearchResult

        if (data.query?.search && data.query.search.length > 0) {
          const pageIds = data.query.search.map((item) => item.pageid).join('|')
          const photos = await this.getImageInfo(pageIds)
          if (photos.length > 0) {
            return photos
          }
        }
      }

      return []
    } catch (error) {
      console.error(`❌ Error searching by name:`, error)
      return []
    }
  }

  /**
   * Get image information for given page IDs
   */
  private async getImageInfo(pageIds: string): Promise<WikimediaPhoto[]> {
    try {
      const baseUrl = 'https://commons.wikimedia.org/w/api.php'
      const params = new URLSearchParams({
        action: 'query',
        pageids: pageIds,
        prop: 'imageinfo',
        iiprop: 'url|extmetadata|size',
        iiurlwidth: '800', // Get medium resolution
        format: 'json',
        origin: '*',
      })

      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: {
          'User-Agent': 'empreinte-backend/1.0.0 (https://github.com/alexphiev/empreinte_backend)',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Wikimedia API error: ${response.status}`)
      }

      const data = (await response.json()) as WikimediaPageResult

      if (!data.query?.pages) {
        return []
      }

      const photos: WikimediaPhoto[] = []

      for (const page of Object.values(data.query.pages)) {
        if (page.imageinfo && page.imageinfo.length > 0) {
          const imageInfo = page.imageinfo[0]
          const url = imageInfo.url

          // Skip if not an image URL
          if (!url || (!url.includes('.jpg') && !url.includes('.jpeg') && !url.includes('.png'))) {
            continue
          }

          // Build attribution
          const extmetadata = imageInfo.extmetadata || {}
          const artist = extmetadata.Artist?.value || 'Unknown'
          const license = extmetadata.LicenseShortName?.value || 'Unknown license'
          const attribution = `Photo by ${artist}, ${license}`

          photos.push({
            url,
            attribution,
            width: imageInfo.width,
            height: imageInfo.height,
          })
        }
      }

      // Sort by resolution (prefer higher resolution)
      return photos.sort((a, b) => {
        const aRes = (a.width || 0) * (a.height || 0)
        const bRes = (b.width || 0) * (b.height || 0)
        return bRes - aRes
      })
    } catch (error) {
      console.error(`❌ Error getting image info:`, error)
      return []
    }
  }
}

export const wikimediaPhotosService = new WikimediaPhotosService()

