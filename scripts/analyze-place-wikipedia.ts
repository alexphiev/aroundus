#!/usr/bin/env ts-node

/**
 * Script to analyze a place's Wikipedia page and extract information using AI
 *
 * Usage:
 *   pnpm run analyze-place-wikipedia <place-id>
 *   ts-node src/scripts/analyze-place-wikipedia.ts <place-id>
 *
 * Example:
 *   pnpm run analyze-place-wikipedia 123e4567-e89b-12d3-a456-426614174000
 */

import 'dotenv/config'
import { analyzePlaceWikipediaCore } from '@/services/wikipedia-analysis.service'

async function main() {
  const placeId = process.argv[2]

  if (!placeId) {
    console.error('❌ Error: Place ID is required')
    console.error('\nUsage:')
    console.error('  pnpm run analyze-place-wikipedia <place-id>')
    console.error('\nExample:')
    console.error('  pnpm run analyze-place-wikipedia 123e4567-e89b-12d3-a456-426614174000')
    process.exit(1)
  }

  console.log('🚀 Starting Wikipedia analysis...\n')
  console.log(`Place ID: ${placeId}\n`)

  try {
    const { result, error } = await analyzePlaceWikipediaCore(placeId, { bypassCache: false })

    if (error || !result) {
      console.error(`❌ ${error || 'No result returned'}`)
      process.exit(1)
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ WIKIPEDIA ANALYSIS COMPLETE')
    console.log('='.repeat(80))

    console.log('\n📝 Description:')
    console.log('-'.repeat(80))
    console.log(result.description || '(No description available)')
    console.log('-'.repeat(80))
    console.log(`Length: ${result.description?.length || 0} characters`)

    if (result.wikipediaReference) {
      console.log(`\n📚 Wikipedia Reference: ${result.wikipediaReference}`)
    }

    console.log('\n✨ Summary:')
    console.log(`   - Description length: ${result.description?.length || 0} chars`)
    console.log(`   - Wikipedia data: ${result.wikipediaData ? 'Available' : 'Not available'}`)

    console.log('\n✅ Script completed successfully!')
  } catch (error) {
    console.error('\n❌ Fatal error occurred:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()

