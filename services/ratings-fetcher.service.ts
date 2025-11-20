import { Place, updatePlace } from '@/services/db/places'
import { calculateGeometryCenter } from '@/services/utils/common'
import { googlePlacesService } from '@/services/google-places.service'
import { recalculateAndUpdateScores } from '@/services/score.service'

export interface RatingsFetchResult {
  placeId: string
  placeName: string
  success: boolean
  rating: number | null
  ratingCount: number | null
  googlePlacesId: string | null
  error?: string
}

export class RatingsFetcherService {
  /**
   * Check if ratings should be fetched (not fetched or older than 6 months)
   */
  private shouldFetchRatings(place: Place): boolean {
    const fetchedAt = place.google_rating_fetched_at

    // If never fetched, should fetch
    if (!fetchedAt) {
      return true
    }

    // Check if older than 6 months
    const fetchedDate = new Date(fetchedAt)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    return fetchedDate < sixMonthsAgo
  }

  /**
   * Fetch ratings for a place from Google Places API
   */
  public async fetchRatingsForPlace(place: Place): Promise<RatingsFetchResult> {
    const result: RatingsFetchResult = {
      placeId: place.id,
      placeName: place.name || 'Unknown',
      success: false,
      rating: null,
      ratingCount: null,
      googlePlacesId: null,
    }

    try {
      // Check if we should fetch ratings
      if (!this.shouldFetchRatings(place)) {
        const fetchedAt = place.google_rating_fetched_at
        console.log(`⏭️  Skipping ${place.name} - ratings fetched recently (${fetchedAt})`)
        result.error = 'Ratings fetched recently (less than 6 months ago)'
        return result
      }

      // Get coordinates from geometry or location
      const center = calculateGeometryCenter(place.geometry)
      const latitude = center?.lat || null
      const longitude = center?.lon || null

      if (!place.name) {
        result.error = 'Place has no name'
        return result
      }

      console.log(`\n⭐ Fetching ratings for: ${place.name}`)
      if (latitude !== null && longitude !== null) {
        console.log(`📍 Location: ${latitude}, ${longitude}`)
      }

      // Check if place already has a Google Places ID
      const existingGooglePlacesId = place.google_places_id || null

      const { rating, ratingCount, googlePlacesId } = await googlePlacesService.searchPlaceRatings(
        place.name,
        latitude,
        longitude,
        existingGooglePlacesId,
      )

      // If place ID not found, mark as fetched to skip retries
      if (googlePlacesId === null) {
        console.log(`❌ Google Place ID not found for: ${place.name}`)
        result.error = 'Google Place ID not found'
        // Mark as fetched to avoid repeated attempts
        await this.markRatingsFetched(place.id, null, null, null)
        return result
      }

      // If place ID found but no ratings, mark as fetched to skip retries
      if (rating === null) {
        console.log(`❌ No ratings found for: ${place.name}`)
        result.error = 'No ratings found'
        result.googlePlacesId = googlePlacesId
        // Still mark as fetched to avoid repeated attempts (but don't bump score)
        await this.markRatingsFetched(place.id, null, null, googlePlacesId)
        return result
      }

      console.log(`✅ Found rating: ${rating} (${ratingCount || 0} reviews)`)

      // Store ratings, Google Places ID, and bump score (+2)
      await this.saveRatings(place.id, rating, ratingCount, googlePlacesId)

      result.success = true
      result.rating = rating
      result.ratingCount = ratingCount
      result.googlePlacesId = googlePlacesId

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Error fetching ratings:`, errorMessage)
      result.error = errorMessage
      return result
    }
  }

  /**
   * Save ratings to database and bump score (only if first time collecting ratings)
   */
  private async saveRatings(
    placeId: string,
    rating: number,
    ratingCount: number | null,
    googlePlacesId: string | null,
  ): Promise<void> {
    try {
      // Get current place to check if it already has ratings
      const { supabase } = await import('../services/supabase.service')
      const { data: place, error: fetchError } = await supabase
        .from('places')
        .select('score, google_rating, enhancement_score')
        .eq('id', placeId)
        .single()

      if (fetchError || !place) {
        console.error(`❌ Error fetching place for score update:`, fetchError)
        throw fetchError
      }

      // Prepare updates
      const updates: Partial<Place> = {
        google_rating: rating,
        google_rating_count: ratingCount,
        google_rating_fetched_at: new Date().toISOString(),
      }

      // Store Google Places ID if we found one and it's different
      if (googlePlacesId) {
        updates.google_places_id = googlePlacesId
      }

      const { error } = await updatePlace(placeId, updates)

      if (error) {
        console.error(`❌ Error saving ratings:`, error)
        throw error
      }

      // Recalculate scores using centralized function
      await recalculateAndUpdateScores(placeId)
    } catch (error) {
      console.error(`❌ Error in saveRatings:`, error)
      throw error
    }
  }

  /**
   * Mark that ratings have been fetched (even if no ratings found)
   */
  private async markRatingsFetched(
    placeId: string,
    rating: number | null,
    ratingCount: number | null,
    googlePlacesId: string | null,
  ): Promise<void> {
    try {
      const updates: Partial<Place> = {
        google_rating_fetched_at: new Date().toISOString(),
      }

      if (rating !== null) {
        updates.google_rating = rating
      }
      if (ratingCount !== null) {
        updates.google_rating_count = ratingCount
      }
      if (googlePlacesId) {
        updates.google_places_id = googlePlacesId
      }

      await updatePlace(placeId, updates)
    } catch (error) {
      console.error(`❌ Error marking ratings as fetched:`, error)
      // Don't throw - this is not critical
    }
  }

  /**
   * Add delay between API requests (1 second as requested)
   */
  public async delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

export const ratingsFetcherService = new RatingsFetcherService()
