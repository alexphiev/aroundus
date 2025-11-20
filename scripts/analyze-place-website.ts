#!/usr/bin/env ts-node

/**
 * Script to analyze a place's website by scraping and using AI to extract information
 *
 * Usage:
 *   pnpm run analyze-place-website <place-id>
 *   ts-node src/scripts/analyze-place-website.ts <place-id>
 *
 * Example:
 *   pnpm run analyze-place-website 123e4567-e89b-12d3-a456-426614174000
 */

import 'dotenv/config'
import { analyzePlaceWebsiteCore } from '@/services/website-analysis.service'

async function main() {
  const placeId = process.argv[2]

  if (!placeId) {
    console.error('❌ Error: Place ID is required')
    console.error('\nUsage:')
    console.error('  pnpm run analyze-place-website <place-id>')
    console.error('\nExample:')
    console.error('  pnpm run analyze-place-website 123e4567-e89b-12d3-a456-426614174000')
    process.exit(1)
  }

  console.log('🚀 Starting place website analysis...\n')
  console.log(`Place ID: ${placeId}\n`)

  try {
    const { result, error } = await analyzePlaceWebsiteCore(placeId, { bypassCache: false })

    if (error) {
      console.error(`❌ ${error}`)
      process.exit(1)
    }

    // Display results
    console.log('\n' + '='.repeat(80))
    console.log('✅ ANALYSIS COMPLETE')
    console.log('='.repeat(80))

    console.log('\n📝 Description:')
    console.log('-'.repeat(80))
    console.log(result.description)
    console.log('-'.repeat(80))
    console.log(`Length: ${result.description.length} characters`)

    console.log('\n📍 Mentioned Places:')
    console.log('-'.repeat(80))
    if (result.mentionedPlaces.length === 0) {
      console.log('(No other places mentioned)')
    } else {
      result.mentionedPlaces.forEach((placeName, index) => {
        console.log(`${index + 1}. ${placeName}`)
      })
    }
    console.log('-'.repeat(80))

    console.log('\n✨ Summary:')
    console.log(`   - Pages scraped: ${result.scrapedPagesCount}`)
    console.log(`   - Description length: ${result.description.length} chars`)
    console.log(`   - Mentioned places: ${result.mentionedPlaces.length}`)

    console.log('\n✅ Script completed successfully!')
  } catch (error) {
    console.error('\n❌ Fatal error occurred:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
