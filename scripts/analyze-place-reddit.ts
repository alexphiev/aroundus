#!/usr/bin/env ts-node

/**
 * Script to analyze a place's Reddit discussions and extract information using AI
 *
 * Usage:
 *   pnpm run analyze-place-reddit <place-id>
 *   ts-node src/scripts/analyze-place-reddit.ts <place-id>
 *
 * Example:
 *   pnpm run analyze-place-reddit 123e4567-e89b-12d3-a456-426614174000
 */

import 'dotenv/config'
import { analyzePlaceRedditCore } from '@/services/reddit-analysis.service'

async function main() {
  const placeId = process.argv[2]

  if (!placeId) {
    console.error('❌ Error: Place ID is required')
    console.error('\nUsage:')
    console.error('  pnpm run analyze-place-reddit <place-id>')
    console.error('\nExample:')
    console.error('  pnpm run analyze-place-reddit 123e4567-e89b-12d3-a456-426614174000')
    process.exit(1)
  }

  console.log('🚀 Starting Reddit analysis...\n')
  console.log(`Place ID: ${placeId}\n`)

  try {
    const { result, error } = await analyzePlaceRedditCore(placeId, { bypassCache: false })

    if (error) {
      console.error(`❌ ${error}`)
      process.exit(1)
    }

    // Display results
    console.log('\n' + '='.repeat(80))
    console.log('✅ REDDIT ANALYSIS COMPLETE')
    console.log('='.repeat(80))

    console.log('\n📝 Description:')
    console.log('-'.repeat(80))
    console.log(result.description)
    console.log('-'.repeat(80))
    console.log(`Length: ${result.description.length} characters`)

    console.log(`\n📱 Threads analyzed: ${result.threadsCount}`)

    console.log('\n✨ Summary:')
    console.log(`   - Description length: ${result.description.length} chars`)
    console.log(`   - Threads analyzed: ${result.threadsCount}`)

    console.log('\n✅ Script completed successfully!')
  } catch (error) {
    console.error('\n❌ Fatal error occurred:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
