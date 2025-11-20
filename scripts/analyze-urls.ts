import 'dotenv/config'
import { analyzeUrlsCore } from '@/services/url-analysis.service'

async function main() {
  const urlsArg = process.argv[2]

  if (!urlsArg) {
    console.error('❌ Error: URLs are required')
    console.error('\nUsage:')
    console.error('  pnpm run analyze-urls <url1> [url2] [url3] ...')
    console.error('\nExample:')
    console.error('  pnpm run analyze-urls "https://example.com/travel-guide"')
    console.error('  pnpm run analyze-urls "https://example.com/guide1" "https://example.com/guide2"')
    process.exit(1)
  }

  // Parse URLs - can be comma-separated or space-separated
  const urls = urlsArg.split(/[,\s]+/).filter((url) => url.trim().length > 0)

  if (urls.length === 0) {
    console.error('❌ Error: No valid URLs provided')
    process.exit(1)
  }

  console.log('🚀 Starting URL analysis...\n')
  console.log(`URLs to analyze: ${urls.length}`)
  urls.forEach((url, index) => {
    console.log(`  ${index + 1}. ${url}`)
  })
  console.log()

  try {
    const { results, error } = await analyzeUrlsCore(urls, { bypassCache: false })

    if (error) {
      console.error(`❌ ${error}`)
      process.exit(1)
    }

    // Display results
    console.log('\n' + '='.repeat(80))
    console.log('✅ URL ANALYSIS COMPLETE')
    console.log('='.repeat(80))

    results.forEach((result, index) => {
      console.log(`\n📄 Source ${index + 1}: ${result.url}`)
      console.log(`   Source ID: ${result.sourceId}`)
      console.log(`   Places found: ${result.places.length}`)
      console.log('-'.repeat(80))

      if (result.places.length === 0) {
        console.log('   (No places found)')
      } else {
        result.places.forEach((place, placeIndex) => {
          console.log(`\n   ${placeIndex + 1}. ${place.name}`)
          if (place.description) {
            console.log(`      Description: ${place.description.substring(0, 200)}${place.description.length > 200 ? '...' : ''}`)
          } else {
            console.log(`      Description: (none)`)
          }
        })
      }
      console.log('-'.repeat(80))
    })

    const totalPlaces = results.reduce((sum, r) => sum + r.places.length, 0)
    console.log(`\n✨ Summary:`)
    console.log(`   - Sources processed: ${results.length}`)
    console.log(`   - Total places extracted: ${totalPlaces}`)
    console.log(`   - Places stored in database: ${totalPlaces}`)

    console.log('\n✅ Script completed successfully!')
  } catch (error) {
    console.error('\n❌ Fatal error occurred:')
    console.error(error)
    process.exit(1)
  }
}

// Run the script
main()

