import 'dotenv/config'
import { VerificationStatus, verifyPlacesCore } from '@/services/place-verification.service'
import { SCORE_CONFIG } from '@/services/score-config.service'

async function main() {
  const arg1 = process.argv[2]
  const arg2 = process.argv[3]
  const arg3 = process.argv[4]

  let generatedPlaceId: string | undefined
  let scoreBump: number | undefined
  let limit: number | undefined

  // Parse arguments
  if (arg1) {
    // Check if arg1 is a UUID (generatedPlaceId) or a number (limit)
    if (arg1.includes('-') && arg1.length > 20) {
      // Looks like a UUID - treat as generatedPlaceId
      generatedPlaceId = arg1
      if (arg2) {
        const arg2AsNumber = parseInt(arg2, 10)
        if (!isNaN(arg2AsNumber) && arg2AsNumber > 0) {
          scoreBump = arg2AsNumber
        }
      }
    } else {
      // arg1 is a number - treat as limit
      const arg1AsNumber = parseInt(arg1, 10)
      if (!isNaN(arg1AsNumber) && arg1AsNumber > 0) {
        limit = arg1AsNumber
      } else {
        console.error('❌ Error: First argument must be a generatedPlaceId (UUID) or limit (number)')
        console.error('\nUsage:')
        console.error('  pnpm run verify-places [limit] [scoreBump]')
        console.error('  pnpm run verify-places <generatedPlaceId> [scoreBump]')
        console.error('\nExamples:')
        console.error('  pnpm run verify-places                    # Verify all places')
        console.error('  pnpm run verify-places 10                 # Verify 10 oldest places')
        console.error('  pnpm run verify-places 10 3               # Verify 10 oldest places with scoreBump 3')
        console.error('  pnpm run verify-places 123e4567-e89b-12d3-a456-426614174000  # Verify single place')
        console.error(
          '  pnpm run verify-places 123e4567-e89b-12d3-a456-426614174000 3  # Verify single place with scoreBump 3',
        )
        process.exit(1)
      }
      if (arg2) {
        const arg2AsNumber = parseInt(arg2, 10)
        if (!isNaN(arg2AsNumber) && arg2AsNumber > 0) {
          scoreBump = arg2AsNumber
        }
      }
    }
  }

  console.log('🚀 Starting place verification...\n')
  if (generatedPlaceId) {
    console.log(`Generated Place ID: ${generatedPlaceId}`)
  } else {
    console.log(`Verifying all generated places without status (sorted by oldest created_at)`)
  }
  const effectiveScoreBump = SCORE_CONFIG.isGeneratedPlaceVerified
  console.log(`Score bump: ${effectiveScoreBump}${scoreBump === undefined ? ' (default from config)' : ' (custom)'}`)
  if (limit) {
    console.log(`Limit: ${limit}`)
  }
  console.log()

  try {
    const { results, error } = await verifyPlacesCore({
      generatedPlaceId,
      limit,
    })

    if (error) {
      console.error(`❌ ${error}`)
      process.exit(1)
    }

    // Display results
    console.log('\n' + '='.repeat(80))
    console.log('✅ PLACE VERIFICATION COMPLETE')
    console.log('='.repeat(80))

    const verifiedCount = results.filter((r) => r.status === VerificationStatus.ADDED).length
    const failedCount = results.length - verifiedCount

    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.generatedPlaceName}`)
      console.log('-'.repeat(80))
      if (result.status === VerificationStatus.ADDED) {
        console.log(`   ✅ Verified (${result.status})`)
        console.log(`   Place ID: ${result.placeId}`)
        if (result.osmId) {
          console.log(`   OSM ID: ${result.osmId}`)
        }
      } else {
        console.log(`   ❌ Not verified (${result.status})`)
        if (result.error) {
          console.log(`   Error: ${result.error}`)
        }
      }
      console.log('-'.repeat(80))
    })

    console.log(`\n✨ Summary:`)
    console.log(`   - Total places: ${results.length}`)
    console.log(`   - Verified: ${verifiedCount}`)
    console.log(`   - Failed: ${failedCount}`)

    console.log('\n✅ Script completed successfully!')
  } catch (error) {
    console.error('\n❌ Fatal error occurred:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()
