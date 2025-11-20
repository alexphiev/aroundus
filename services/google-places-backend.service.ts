export interface GooglePlacesPhoto {
  url: string
  attribution: string
  width?: number
  height?: number
}

export class GooglePlacesPhotosService {
  private readonly apiKey: string
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly BASE_RETRY_DELAY_MS = 2000 // 2 seconds
  private readonly REQUEST_TIMEOUT_MS = 15000 // 15 seconds

  constructor() {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      throw new Error('GOOGLE_PLACES_API_KEY environment variable is required')
    }
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY
  }

  /**
   * Checks if an error is a retryable network error (DNS, timeout, connection issues)
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }

    const errorMessage = error.message.toLowerCase()
    const errorName = error.name.toLowerCase()

    // DNS errors
    if (errorMessage.includes('enotfound') || errorMessage.includes('getaddrinfo')) {
      return true
    }

    // Network errors
    if (errorMessage.includes('fetch failed') || errorMessage.includes('network')) {
      return true
    }

    // Timeout errors
    if (errorName === 'timeouterror' || errorMessage.includes('timeout')) {
      return true
    }

    // Connection errors
    if (errorMessage.includes('econnrefused') || errorMessage.includes('econnreset')) {
      return true
    }

    return false
  }

  /**
   * Search for a place using Google Places API Text Search
   * Returns place_id if found
   */
  public async findPlaceId(
    placeName: string,
    latitude: number | null,
    longitude: number | null,
  ): Promise<string | null> {
    const baseUrl = 'https://places.googleapis.com/v1/places:searchText'
    const body: any = {
      textQuery: placeName,
      maxResultCount: 1,
    }

    // Add location bias if coordinates available
    if (latitude !== null && longitude !== null) {
      body.locationBias = {
        circle: {
          center: {
            latitude,
            longitude,
          },
          radius: 5000.0, // 5km radius
        },
      }
    }

    let lastError: unknown = null

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        if (attempt === 1) {
          console.log(`🔍 Searching Google Places for: ${placeName}`)
        } else {
          console.log(`🔄 Retrying Google Places search (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS})...`)
        }

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
        })

        if (!response.ok) {
          const errorText = await response.text()
          const error = new Error(`Google Places API error: ${response.status} - ${errorText}`)

          // Don't retry on API errors (4xx, 5xx) unless it's a rate limit
          if (response.status === 429) {
            // Rate limit - retry with exponential backoff
            const delayMs = Math.min(this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), 60000)
            console.warn(`⚠️  Rate limited (429). Waiting ${delayMs}ms before retry...`)
            if (attempt < this.MAX_RETRY_ATTEMPTS) {
              await new Promise((resolve) => setTimeout(resolve, delayMs))
              continue
            }
          }

          // For other API errors, don't retry
          throw error
        }

        const data = (await response.json()) as {
          places?: Array<{
            id: string
            displayName?: { text: string }
          }>
        }

        if (data.places && data.places.length > 0) {
          const placeId = data.places[0].id
          console.log(`✅ Found Google Place ID: ${placeId}`)
          return placeId
        }

        console.log(`❌ No Google Place found for: ${placeName}`)
        return null
      } catch (error) {
        lastError = error

        // Check if it's a retryable network error
        if (this.isRetryableError(error)) {
          if (attempt === 1) {
            console.warn(`⚠️  Network error (DNS/connection). Will retry...`)
            if (error instanceof Error) {
              console.error(`Error details:`, {
                name: error.name,
                message: error.message.substring(0, 200),
                code: (error as any).code,
              })
            }
          }

          // If this is the last attempt, throw the error
          if (attempt === this.MAX_RETRY_ATTEMPTS) {
            console.error(`❌ All ${this.MAX_RETRY_ATTEMPTS} retry attempts exhausted for network error`)
            console.error(`❌ Error searching Google Places:`, error)
            return null
          }

          // Exponential backoff for network errors
          const delayMs = Math.min(this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), 30000) // Max 30 seconds
          console.warn(`⏳ Waiting ${delayMs}ms before retry...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          continue
        }

        // For non-retryable errors, log and return null
        console.error(`❌ Error searching Google Places:`, error)
        return null
      }
    }

    // This should never be reached, but TypeScript needs it
    console.error(`❌ Error searching Google Places:`, lastError)
    return null
  }

  /**
   * Get photos for a place using Google Places API
   */
  public async getPlacePhotos(placeId: string): Promise<GooglePlacesPhoto[]> {
    const baseUrl = `https://places.googleapis.com/v1/places/${placeId}`
    let lastError: unknown = null

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        if (attempt === 1) {
          console.log(`📸 Fetching photos for Google Place ID: ${placeId}`)
        } else {
          console.log(`🔄 Retrying photo fetch (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS})...`)
        }

        const response = await fetch(baseUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'photos',
          },
          signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
        })

        if (!response.ok) {
          const errorText = await response.text()
          const error = new Error(`Google Places API error: ${response.status} - ${errorText}`)

          // Don't retry on API errors (4xx, 5xx) unless it's a rate limit
          if (response.status === 429) {
            // Rate limit - retry with exponential backoff
            const delayMs = Math.min(this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), 60000)
            console.warn(`⚠️  Rate limited (429). Waiting ${delayMs}ms before retry...`)
            if (attempt < this.MAX_RETRY_ATTEMPTS) {
              await new Promise((resolve) => setTimeout(resolve, delayMs))
              continue
            }
          }

          // For other API errors, don't retry
          throw error
        }

        const data = (await response.json()) as {
          photos?: Array<{
            name: string
            widthPx?: number
            heightPx?: number
            authorAttributions?: Array<{
              displayName?: string
              uri?: string
            }>
          }>
        }

        if (!data.photos || data.photos.length === 0) {
          console.log(`❌ No photos found for Google Place ID: ${placeId}`)
          return []
        }

        const photos: GooglePlacesPhoto[] = []

        // Get up to 5 photos
        const photosToFetch = data.photos.slice(0, 5)

        for (const photo of photosToFetch) {
          // Build photo URL using the photo name
          // Format: https://places.googleapis.com/v1/{photo.name}/media?maxHeightPx=800&maxWidthPx=800&key={API_KEY}
          const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=800&key=${this.apiKey}`

          // Build attribution
          const author = photo.authorAttributions?.[0]
          const attribution = author?.displayName
            ? `Photo by ${author.displayName} via Google Places`
            : 'Photo via Google Places'

          photos.push({
            url: photoUrl,
            attribution,
            width: photo.widthPx,
            height: photo.heightPx,
          })
        }

        console.log(`✅ Found ${photos.length} photos from Google Places`)
        return photos
      } catch (error) {
        lastError = error

        // Check if it's a retryable network error
        if (this.isRetryableError(error)) {
          if (attempt === 1) {
            console.warn(`⚠️  Network error (DNS/connection). Will retry...`)
            if (error instanceof Error) {
              console.error(`Error details:`, {
                name: error.name,
                message: error.message.substring(0, 200),
                code: (error as any).code,
              })
            }
          }

          // If this is the last attempt, return empty array
          if (attempt === this.MAX_RETRY_ATTEMPTS) {
            console.error(`❌ All ${this.MAX_RETRY_ATTEMPTS} retry attempts exhausted for network error`)
            console.error(`❌ Error fetching Google Places photos:`, error)
            return []
          }

          // Exponential backoff for network errors
          const delayMs = Math.min(this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), 30000) // Max 30 seconds
          console.warn(`⏳ Waiting ${delayMs}ms before retry...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          continue
        }

        // For non-retryable errors, log and return empty array
        console.error(`❌ Error fetching Google Places photos:`, error)
        return []
      }
    }

    // This should never be reached, but TypeScript needs it
    console.error(`❌ Error fetching Google Places photos:`, lastError)
    return []
  }

  /**
   * Search for photos of a place by name and coordinates
   * Returns photos and the Google Places ID (if found)
   */
  public async searchPlacePhotos(
    placeName: string,
    latitude: number | null,
    longitude: number | null,
    existingGooglePlacesId?: string | null,
  ): Promise<{ photos: GooglePlacesPhoto[]; googlePlacesId: string | null }> {
    // Use existing Google Places ID if available
    let placeId: string | null = existingGooglePlacesId || null

    // If no existing ID, search for it
    if (!placeId) {
      placeId = await this.findPlaceId(placeName, latitude, longitude)
    } else {
      console.log(`✅ Using existing Google Places ID: ${placeId}`)
    }

    if (!placeId) {
      return { photos: [], googlePlacesId: null }
    }

    const photos = await this.getPlacePhotos(placeId)
    return { photos, googlePlacesId: placeId }
  }

  /**
   * Get ratings for a place using Google Places API
   */
  public async getPlaceRatings(placeId: string): Promise<{ rating: number | null; ratingCount: number | null }> {
    const baseUrl = `https://places.googleapis.com/v1/places/${placeId}`
    let lastError: unknown = null

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        if (attempt === 1) {
          console.log(`⭐ Fetching ratings for Google Place ID: ${placeId}`)
        } else {
          console.log(`🔄 Retrying rating fetch (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS})...`)
        }

        const response = await fetch(baseUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'rating,userRatingCount',
          },
          signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
        })

        if (!response.ok) {
          const errorText = await response.text()
          const error = new Error(`Google Places API error: ${response.status} - ${errorText}`)

          // Don't retry on API errors (4xx, 5xx) unless it's a rate limit
          if (response.status === 429) {
            // Rate limit - retry with exponential backoff
            const delayMs = Math.min(this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), 60000)
            console.warn(`⚠️  Rate limited (429). Waiting ${delayMs}ms before retry...`)
            if (attempt < this.MAX_RETRY_ATTEMPTS) {
              await new Promise((resolve) => setTimeout(resolve, delayMs))
              continue
            }
          }

          // For other API errors, don't retry
          throw error
        }

        const data = (await response.json()) as {
          rating?: number
          userRatingCount?: number
        }

        const rating = data.rating ?? null
        const ratingCount = data.userRatingCount ?? null

        if (rating !== null) {
          console.log(`✅ Found rating: ${rating} (${ratingCount || 0} reviews)`)
        } else {
          console.log(`❌ No rating found for Google Place ID: ${placeId}`)
        }

        return { rating, ratingCount }
      } catch (error) {
        lastError = error

        // Check if it's a retryable network error
        if (this.isRetryableError(error)) {
          if (attempt === 1) {
            console.warn(`⚠️  Network error (DNS/connection). Will retry...`)
            if (error instanceof Error) {
              console.error(`Error details:`, {
                name: error.name,
                message: error.message.substring(0, 200),
                code: (error as any).code,
              })
            }
          }

          // If this is the last attempt, return null values
          if (attempt === this.MAX_RETRY_ATTEMPTS) {
            console.error(`❌ All ${this.MAX_RETRY_ATTEMPTS} retry attempts exhausted for network error`)
            console.error(`❌ Error fetching Google Places ratings:`, error)
            return { rating: null, ratingCount: null }
          }

          // Exponential backoff for network errors
          const delayMs = Math.min(this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), 30000) // Max 30 seconds
          console.warn(`⏳ Waiting ${delayMs}ms before retry...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          continue
        }

        // For non-retryable errors, log and return null values
        console.error(`❌ Error fetching Google Places ratings:`, error)
        return { rating: null, ratingCount: null }
      }
    }

    // This should never be reached, but TypeScript needs it
    console.error(`❌ Error fetching Google Places ratings:`, lastError)
    return { rating: null, ratingCount: null }
  }

  /**
   * Search for ratings of a place by name and coordinates
   * Returns ratings and the Google Places ID (if found)
   */
  public async searchPlaceRatings(
    placeName: string,
    latitude: number | null,
    longitude: number | null,
    existingGooglePlacesId?: string | null,
  ): Promise<{ rating: number | null; ratingCount: number | null; googlePlacesId: string | null }> {
    // Use existing Google Places ID if available
    let placeId: string | null = existingGooglePlacesId || null

    // If no existing ID, search for it
    if (!placeId) {
      placeId = await this.findPlaceId(placeName, latitude, longitude)
    } else {
      console.log(`✅ Using existing Google Places ID: ${placeId}`)
    }

    if (!placeId) {
      return { rating: null, ratingCount: null, googlePlacesId: null }
    }

    const { rating, ratingCount } = await this.getPlaceRatings(placeId)
    return { rating, ratingCount, googlePlacesId: placeId }
  }
}

export const googlePlacesPhotosService = new GooglePlacesPhotosService()
export const googlePlacesService = googlePlacesPhotosService
