#!/usr/bin/env ts-node

/**
 * Batch script to analyze multiple places' websites by scraping and using AI to extract information
 *
 * Usage:
 *   pnpm run batch-analyze-place-websites [--limit=<number>] [--bypass]
 *   ts-node src/scripts/batch-analyze-place-websites.ts [--limit=<number>] [--bypass]
 *
 * Examples:
 *   pnpm run batch-analyze-place-websites
 *   pnpm run batch-analyze-place-websites --limit=10
 *   pnpm run batch-analyze-place-websites --limit=10 --bypass
 */

import 'dotenv/config'
import { supabase } from '@/db/supabase'
import { analyzePlaceWebsiteCore } from '@/services/website-analysis.service'
import { Place } from '@/db/places'

interface ProcessStats {
  processedCount: number
  successCount: number
  errorCount: number
}

class BatchWebsiteAnalyzer {
  public readonly stats: ProcessStats
  private readonly bypassCache: boolean

  constructor(bypassCache: boolean = false) {
    this.stats = {
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
    }
    this.bypassCache = bypassCache
  }

  private printProgress(): void {
    console.log(`\n📊 Progress:`)
    console.log(`   Processed: ${this.stats.processedCount}`)
    console.log(`   Success: ${this.stats.successCount}`)
    console.log(`   Errors: ${this.stats.errorCount}`)
  }

  public async analyzeWebsites(limit?: number): Promise<void> {
    console.log(`\n🔍 Starting batch website analysis`)
    if (limit !== undefined) {
      console.log(`🔢 Limit: ${limit} places`)
    }
    if (this.bypassCache) {
      console.log(`🔄 Bypassing cache - will fetch fresh content`)
    }

    // Get places with websites that haven't been analyzed (or all if bypassing)
    let query = supabase
      .from('places')
      .select('*')
      .not('website', 'is', null) // Places that have a website

    if (!this.bypassCache) {
      // Only get places that haven't been analyzed yet
      query = query.is('website_analyzed_at', null)
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

    // Process places one by one
    for (let i = 0; i < placesToProcess.length; i++) {
      const place = placesToProcess[i] as Place
      console.log(`\n📍 Processing place ${i + 1}/${placesToProcess.length}: ${place.name}`)

      try {
        const { result, error } = await analyzePlaceWebsiteCore(place.id, { bypassCache: this.bypassCache })
        this.stats.processedCount++

        if (error) {
          this.stats.errorCount++
          console.error(`❌ Error: ${error}`)
        } else {
          this.stats.successCount++
          console.log(`✅ Success: ${result.description.length} chars, ${result.mentionedPlaces.length} places mentioned`)
        }

        // Print progress every 10 places
        if ((i + 1) % 10 === 0) {
          this.printProgress()
        }

        // Add delay between requests (except for the last one)
        if (i < placesToProcess.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (error) {
        this.stats.processedCount++
        this.stats.errorCount++
        console.error(`❌ Fatal error processing place ${place.name}:`, error)
      }
    }

    // Final summary
    console.log(`\n✅ Batch website analysis complete!`)
    this.printProgress()
  }
}

async function main() {
  const args = process.argv.slice(2)
  let limit: number | undefined
  let bypass = false

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--limit=')) {
      limit = Number(args[i].split('=')[1])
      if (isNaN(limit) || limit < 1) {
        console.error('❌ limit must be a positive number')
        process.exit(1)
      }
    } else if (args[i] === '--bypass') {
      bypass = true
    }
  }

  const analyzer = new BatchWebsiteAnalyzer(bypass)

  try {
    await analyzer.analyzeWebsites(limit)
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
main()

