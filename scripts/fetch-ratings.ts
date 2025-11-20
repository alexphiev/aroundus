import 'dotenv/config'
import { supabase } from '@/db/supabase'
import { ratingsFetcherService } from '@/services/ratings-fetcher.service'
import { Place } from '@/db/places'

interface ProcessStats {
  processedCount: number
  successCount: number
  errorCount: number
  skippedCount: number
}

class RatingsFetcher {
  public readonly stats: ProcessStats

  constructor() {
    this.stats = {
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
    }
  }

  private printProgress(): void {
    console.log(`\n📊 Progress:`)
    console.log(`   Processed: ${this.stats.processedCount}`)
    console.log(`   Success: ${this.stats.successCount}`)
    console.log(`   Skipped: ${this.stats.skippedCount}`)
    console.log(`   Errors: ${this.stats.errorCount}`)
  }

  public async fetchRatingsForPlaces(minScore?: number, limit?: number): Promise<void> {
    console.log(`\n⭐ Starting ratings fetch process`)
    if (minScore !== undefined) {
      console.log(`📊 Minimum score filter: ${minScore}`)
    }
    if (limit !== undefined) {
      console.log(`🔢 Limit: ${limit} places`)
    }

    // Get places that need ratings fetched
    // Either never fetched, or fetched more than 6 months ago
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    let query = supabase
      .from('places')
      .select('*')
      .or(
        `google_rating_fetched_at.is.null,google_rating_fetched_at.lt.${sixMonthsAgo.toISOString()}`,
      )

    if (minScore !== undefined) {
      query = query.gte('score', minScore)
    }

    // Order by score descending to prioritize higher-scored places
    query = query.order('score', { ascending: false })

    if (limit !== undefined) {
      query = query.limit(limit)
    }

    const { data: placesToProcess, error: queryError } = await query

    if (queryError) {
      console.error('❌ Error fetching places:', queryError)
      throw queryError
    }

    if (!placesToProcess || placesToProcess.length === 0) {
      console.log('✅ No places to process!')
      return
    }

    console.log(`📋 Found ${placesToProcess.length} places to process`)

    // Process places one by one with delay
    for (let i = 0; i < placesToProcess.length; i++) {
      const place = placesToProcess[i] as Place
      console.log(`\n📍 Processing place ${i + 1}/${placesToProcess.length}: ${place.name}`)

      try {
        const result = await ratingsFetcherService.fetchRatingsForPlace(place)
        this.stats.processedCount++

        if (result.success) {
          this.stats.successCount++
        } else if (result.error?.includes('recently')) {
          this.stats.skippedCount++
        } else {
          this.stats.errorCount++
        }

        // Print progress every 10 places
        if ((i + 1) % 10 === 0) {
          this.printProgress()
        }

        // Add delay between requests (except for the last one)
        if (i < placesToProcess.length - 1) {
          await ratingsFetcherService.delay()
        }
      } catch (error) {
        this.stats.processedCount++
        this.stats.errorCount++
        console.error(`❌ Error processing place ${place.name}:`, error)
      }
    }

    // Final summary
    console.log(`\n✅ Ratings fetch complete!`)
    this.printProgress()
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

  const fetcher = new RatingsFetcher()

  try {
    await fetcher.fetchRatingsForPlaces(minScore, limit)
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

