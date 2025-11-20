import { createPlacePhotos, setPrimaryPhoto } from '@/services/db/place-photos'
import { Place, updatePlace } from '@/services/db/places'
import { calculateGeometryCenter } from '@/services/utils/common'
import { GooglePlacesPhoto, googlePlacesPhotosService } from '@/services/google-places.service'
import { recalculateAndUpdateScores } from '@/services/score.service'
import { WikimediaPhoto, wikimediaPhotosService } from '@/services/wikimedia-photos.service'

export interface PhotoFetchResult {
  placeId: string
  placeName: string
  success: boolean
  photosFound: number
  source: 'wikimedia' | 'google_places' | 'both' | 'none'
  error?: string
}

export class PhotoFetcherService {
  /**
   * Fetch photos for a place, trying Wikimedia first, then Google Places
   */
  public async fetchPhotosForPlace(place: Place): Promise<PhotoFetchResult> {
    const result: PhotoFetchResult = {
      placeId: place.id,
      placeName: place.name || 'Unknown',
      success: false,
      photosFound: 0,
      source: 'none',
    }

    try {
      // Get coordinates from geometry or location
      const center = calculateGeometryCenter(place.geometry)
      const latitude = center?.lat || null
      const longitude = center?.lon || null

      if (!place.name) {
        result.error = 'Place has no name'
        return result
      }

      console.log(`\n📸 Fetching photos for: ${place.name}`)
      if (latitude !== null && longitude !== null) {
        console.log(`📍 Location: ${latitude}, ${longitude}`)
      }

      // Try Wikimedia first (free)
      console.log(`1️⃣ Trying Wikimedia Commons...`)
      const wikimediaPhotos = await wikimediaPhotosService.searchPlacePhotos(
        place.name,
        latitude,
        longitude,
        place.osm_id || null,
      )

      if (wikimediaPhotos.length > 0 && wikimediaPhotos.length < 4) {
        console.log(`⚠️ Found only ${wikimediaPhotos.length} photos from Wikimedia Commons, will also fetch Google Places`)
        await this.savePhotos(place.id, wikimediaPhotos, 'wikimedia')
      } else if (wikimediaPhotos.length >= 4) {
        console.log(`✅ Found ${wikimediaPhotos.length} photos from Wikimedia Commons (enough)`)
        await this.savePhotos(place.id, wikimediaPhotos, 'wikimedia')
        result.success = true
        result.photosFound = wikimediaPhotos.length
        result.source = 'wikimedia'
        await this.markPhotosFetched(place.id)
        return result
      }

      // Try Google Places if no Wikimedia photos or less than 4 found
      console.log(`2️⃣ ${wikimediaPhotos.length > 0 ? 'Also trying' : 'Trying'} Google Places...`)
      if (latitude === null || longitude === null) {
        console.log(`⚠️ No coordinates available, skipping Google Places search`)
        result.error = 'No coordinates available for Google Places search'
        await this.markPhotosFetched(place.id)
        return result
      }

      // Check if place already has a Google Places ID
      // Note: google_places_id will be available after running the schema migration
      const existingGooglePlacesId = (place as any).google_places_id || null

      const { photos: googlePhotos, googlePlacesId } = await googlePlacesPhotosService.searchPlacePhotos(
        place.name,
        latitude,
        longitude,
        existingGooglePlacesId,
      )

      if (googlePhotos.length > 0) {
        console.log(`✅ Found ${googlePhotos.length} photos from Google Places`)
        await this.savePhotos(place.id, googlePhotos, 'google_places')
        result.success = true
        result.photosFound = wikimediaPhotos.length + googlePhotos.length
        result.source = wikimediaPhotos.length > 0 ? 'both' : 'google_places'

        // Store Google Places ID if we found one and it's different from existing
        if (googlePlacesId && googlePlacesId !== existingGooglePlacesId) {
          console.log(`💾 Storing Google Places ID: ${googlePlacesId}`)
          await updatePlace(place.id, {
            google_places_id: googlePlacesId,
          })
        }

        await this.markPhotosFetched(place.id)
        return result
      }

      // Even if no photos found, store the Google Places ID if we found one
      if (googlePlacesId && googlePlacesId !== existingGooglePlacesId) {
        console.log(`💾 Storing Google Places ID (no photos found): ${googlePlacesId}`)
        await updatePlace(place.id, {
          google_places_id: googlePlacesId,
        })
      }

      // If we have some Wikimedia photos but no Google Places photos, that's still a success
      if (wikimediaPhotos.length > 0) {
        console.log(`✅ Using ${wikimediaPhotos.length} photos from Wikimedia Commons only`)
        result.success = true
        result.photosFound = wikimediaPhotos.length
        result.source = 'wikimedia'
        await this.markPhotosFetched(place.id)
        return result
      }

      console.log(`❌ No photos found from any source`)
      result.error = 'No photos found'
      await this.markPhotosFetched(place.id)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Error fetching photos:`, errorMessage)
      result.error = errorMessage

      await this.markPhotosFetched(place.id)
      return result
    }
  }

  /**
   * Save photos to database and set the first one as primary
   */
  private async savePhotos(
    placeId: string,
    photos: WikimediaPhoto[] | GooglePlacesPhoto[],
    source: 'wikimedia' | 'google_places',
  ): Promise<void> {
    if (photos.length === 0) {
      return
    }

    try {
      // Convert to database format
      const photosToInsert = photos.map((photo, index) => ({
        place_id: placeId,
        source,
        url: photo.url,
        attribution: photo.attribution,
        is_primary: index === 0, // First photo is primary
      }))

      const { data, error } = await createPlacePhotos(photosToInsert)

      if (error) {
        console.error(`❌ Error saving photos:`, error)
        throw error
      }

      console.log(`✅ Saved ${photosToInsert.length} photos to database`)

      // Ensure first photo is marked as primary (in case of duplicates)
      if (data && data.length > 0) {
        await setPrimaryPhoto(placeId, data[0].id)
      }
    } catch (error) {
      console.error(`❌ Error in savePhotos:`, error)
      throw error
    }
  }

  /**
   * Mark that photos have been fetched for this place
   * If photos were successfully fetched for the first time, bump scores by +2
   */
  private async markPhotosFetched(placeId: string): Promise<void> {
    try {
      // Update photos_fetched_at timestamp
      await updatePlace(placeId, {
        photos_fetched_at: new Date().toISOString(),
      })

      // Recalculate scores using centralized function
      await recalculateAndUpdateScores(placeId)
    } catch (error) {
      console.error(`❌ Error marking photos as fetched:`, error)
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

export const photoFetcherService = new PhotoFetcherService()
