import 'dotenv/config'
import { photoFetcherService } from '@/services/photo-fetcher.service'
import {
  Place,
  getPlacesWithoutPhotos,
  getPlacesWithoutPhotosCount,
  getPlacesWithPhotosButNoTimestamp,
  getPlacesWithPhotosButNoTimestampCount,
  batchUpdatePhotosFetchedAt,
} from '@/db/places'
import { retryAsync } from '@/utils/retry'

interface ProcessStats {
  processedCount: number
  successCount: number
  errorCount: number
  photosFound: number
  timestampUpdated: number
}

async function getPlacesWithRetry(
  limit: number,
  offset: number,
  minScore?: number,
): Promise<{ data: Place[] | null; error: any }> {
  return retryAsync(() => getPlacesWithoutPhotos(limit, offset, minScore), 'Fetch places')
}

async function getPlacesWithPhotosWithRetry(
  limit: number,
  offset: number,
  minScore?: number,
): Promise<{ data: Place[] | null; error: any }> {
  return retryAsync(() => getPlacesWithPhotosButNoTimestamp(limit, offset, minScore), 'Fetch places with photos')
}

class PhotoFetcher {
  public readonly stats: ProcessStats

  constructor() {
    this.stats = {
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      photosFound: 0,
      timestampUpdated: 0,
    }
  }

  private printProgress(totalPlaces: number): void {
    console.log(`\n📊 Progress:`)
    console.log(`   Processed: ${this.stats.processedCount}/${totalPlaces}`)
    console.log(`   Success: ${this.stats.successCount}`)
    console.log(`   Errors: ${this.stats.errorCount}`)
    console.log(`   Photos found: ${this.stats.photosFound}`)
    console.log(`   Timestamps updated: ${this.stats.timestampUpdated}`)
  }

  private async updateExistingPhotosTimestamps(minScore?: number): Promise<void> {
    console.log('\n🕒 Checking for places with photos but missing timestamps...')

    const { count, error: countError } = await getPlacesWithPhotosButNoTimestampCount(minScore)

    if (countError || count === null) {
      console.error('❌ Error counting places:', countError)
      return
    }

    if (count === 0) {
      console.log('✅ No places need timestamp updates')
      return
    }

    console.log(`📋 Found ${count.toLocaleString()} places with photos needing timestamps\n`)

    const BATCH_SIZE = 1000
    let offset = 0
    let hasMore = true
    let updatedCount = 0

    while (hasMore) {
      const { data: places, error } = await getPlacesWithPhotosWithRetry(BATCH_SIZE, offset, minScore)

      if (error) {
        console.error('❌ Error fetching places:', error)
        break
      }

      if (!places || places.length === 0) {
        break
      }

      const placeIds = places.map((p) => p.id)
      const { error: updateError } = await batchUpdatePhotosFetchedAt(placeIds)

      if (updateError) {
        console.error('❌ Error updating timestamps:', updateError)
      } else {
        updatedCount += placeIds.length
        this.stats.timestampUpdated += placeIds.length
        console.log(`✅ Updated ${updatedCount}/${count} timestamps`)
      }

      if (places.length < BATCH_SIZE) {
        hasMore = false
      } else {
        offset += BATCH_SIZE
      }
    }

    console.log(`\n✅ Timestamp update complete! Updated ${updatedCount} places\n`)
  }

  public async fetchPhotosForPlaces(minScore?: number, maxPlaces?: number): Promise<void> {
    const effectiveMinScore = minScore ?? 3

    console.log(`\n📸 Starting photo fetch process`)
    console.log(`📊 Minimum score filter: ${effectiveMinScore}`)
    if (maxPlaces !== undefined) {
      console.log(`🔢 Max places to process: ${maxPlaces}`)
    }

    await this.updateExistingPhotosTimestamps(effectiveMinScore)

    const { count: totalPlaces, error: countError } = await getPlacesWithoutPhotosCount(effectiveMinScore)

    if (countError || totalPlaces === null) {
      console.error('❌ Error fetching places count:', countError)
      throw countError
    }

    if (totalPlaces === 0) {
      console.log('✅ No places to process!')
      return
    }

    const placesToProcess = maxPlaces !== undefined ? Math.min(totalPlaces, maxPlaces) : totalPlaces
    console.log(`📋 Found ${placesToProcess.toLocaleString()} places to process\n`)

    const BATCH_SIZE = 1000
    let offset = 0
    let hasMore = true

    while (hasMore && this.stats.processedCount < placesToProcess) {
      const { data: places, error } = await getPlacesWithRetry(BATCH_SIZE, offset, effectiveMinScore)

      if (error) {
        console.error('❌ Error fetching places:', error)
        throw error
      }

      if (!places || places.length === 0) {
        break
      }

      for (let i = 0; i < places.length && this.stats.processedCount < placesToProcess; i++) {
        const place = places[i] as Place
        console.log(`\n📍 Processing place ${this.stats.processedCount + 1}/${placesToProcess}: ${place.name}`)

        try {
          const result = await photoFetcherService.fetchPhotosForPlace(place)
          this.stats.processedCount++

          if (result.success) {
            this.stats.successCount++
            this.stats.photosFound += result.photosFound
          } else {
            this.stats.errorCount++
          }

          if (this.stats.processedCount % 10 === 0) {
            this.printProgress(placesToProcess)
          }

          if (i < places.length - 1 && this.stats.processedCount < placesToProcess) {
            await photoFetcherService.delay()
          }
        } catch (error) {
          this.stats.processedCount++
          this.stats.errorCount++
          console.error(`❌ Error processing place ${place.name}:`, error)
        }
      }

      if (places.length < BATCH_SIZE) {
        hasMore = false
      } else {
        offset += BATCH_SIZE
      }
    }

    console.log(`\n✅ Photo fetch complete!`)
    this.printProgress(placesToProcess)
  }
}

async function main() {
  const args = process.argv.slice(2)
  let minScore: number | undefined
  let limit: number | undefined

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--minScore' && i + 1 < args.length) {
      minScore = Number(args[i + 1])
      if (isNaN(minScore) || minScore < 0) {
        console.error('❌ minScore must be a non-negative number')
        process.exit(1)
      }
      i++
    } else if (args[i] === '--limit' && i + 1 < args.length) {
      limit = Number(args[i + 1])
      if (isNaN(limit) || limit < 1) {
        console.error('❌ limit must be a positive number')
        process.exit(1)
      }
      i++
    }
  }

  const fetcher = new PhotoFetcher()

  try {
    await fetcher.fetchPhotosForPlaces(minScore, limit)
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

