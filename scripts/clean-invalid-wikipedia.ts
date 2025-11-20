import { clearPlaceWikipediaData, getPlacesWithWikipediaQuery, PlaceWithWikipediaQuery } from '@/db/places'
import { deleteWikipediaByPlaceId } from '@/db/wikipedia'
import { recalculateAndUpdateScores } from '@/services/score.service'
import { retryAsync } from '@/utils/retry'
import { calculateStringSimilarity } from '@/utils/string.utils'

const MIN_SIMILARITY_THRESHOLD = 0.7
const MANUAL_REVIEW_THRESHOLD = 0.3
const BATCH_SIZE = 100

async function cleanInvalidWikipediaData() {
  console.log('🔍 Checking for places with invalid Wikipedia queries...\n')

  let allPlaces: PlaceWithWikipediaQuery[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data: places, error } = await retryAsync(
      () => getPlacesWithWikipediaQuery(BATCH_SIZE, offset),
      `Fetching places with Wikipedia queries (offset ${offset})`,
    )

    if (error) {
      console.error('❌ Error fetching places:', error)
      return
    }

    if (!places || places.length === 0) {
      hasMore = false
      break
    }

    allPlaces = allPlaces.concat(places)
    console.log(`  Loaded ${allPlaces.length} places...`)

    if (places.length < BATCH_SIZE) {
      hasMore = false
    } else {
      offset += BATCH_SIZE
    }
  }

  if (allPlaces.length === 0) {
    console.log('✅ No places with Wikipedia queries found')
    return
  }

  console.log(`\n📊 Found ${allPlaces.length} places with Wikipedia queries\n`)

  const invalidPlaces: Array<{
    id: string
    name: string
    wikipediaQuery: string
    similarity: number
  }> = []

  const manualReviewPlaces: Array<{
    id: string
    name: string
    wikipediaQuery: string
    similarity: number
  }> = []

  for (const place of allPlaces) {
    if (!place.wikipedia_query || !place.name) {
      continue
    }

    const hasWikipediaTag = place.metadata?.tags?.wikipedia || place.metadata?.tags?.['wikipedia:fr']

    if (hasWikipediaTag) {
      continue
    }

    const wikipediaTitle = place.wikipedia_query.split(':')[1] || place.wikipedia_query
    const similarity = calculateStringSimilarity(place.name, wikipediaTitle)

    if (similarity < MIN_SIMILARITY_THRESHOLD) {
      invalidPlaces.push({
        id: place.id,
        name: place.name,
        wikipediaQuery: place.wikipedia_query,
        similarity,
      })

      if (similarity >= MANUAL_REVIEW_THRESHOLD) {
        manualReviewPlaces.push({
          id: place.id,
          name: place.name,
          wikipediaQuery: place.wikipedia_query,
          similarity,
        })
      }
    }
  }

  if (invalidPlaces.length === 0) {
    console.log('✅ No invalid Wikipedia queries found')
    return
  }

  console.log(`❌ Found ${invalidPlaces.length} places with invalid Wikipedia queries (will be cleaned):\n`)

  for (const place of invalidPlaces) {
    console.log(`  - "${place.name}" → "${place.wikipediaQuery}" (similarity: ${place.similarity.toFixed(2)})`)
  }

  console.log('\n🗑️  Cleaning invalid Wikipedia data...\n')

  let deletedWikipediaCount = 0
  let clearedFieldsCount = 0

  for (const place of invalidPlaces) {
    const { error: deleteError } = await retryAsync(
      () => deleteWikipediaByPlaceId(place.id),
      `Deleting Wikipedia data for ${place.name}`,
    )

    if (deleteError) {
      console.error(`❌ Error deleting Wikipedia data for ${place.name}:`, deleteError)
      continue
    }

    deletedWikipediaCount++

    const { error: updateError } = await retryAsync(
      () => clearPlaceWikipediaData(place.id),
      `Clearing Wikipedia fields for ${place.name}`,
    )

    if (updateError) {
      console.error(`❌ Error clearing fields for ${place.name}:`, updateError)
      continue
    }

    clearedFieldsCount++
    console.log(`  ✅ Cleaned: "${place.name}"`)
  }

  console.log('\n📊 Summary:')
  console.log(`  - Wikipedia objects deleted: ${deletedWikipediaCount}`)
  console.log(`  - Place fields cleared: ${clearedFieldsCount}`)

  if (clearedFieldsCount > 0) {
    console.log('\n♻️  Recalculating scores for updated places...\n')

    let recalculatedCount = 0
    for (const place of invalidPlaces) {
      try {
        await recalculateAndUpdateScores(place.id)
        recalculatedCount++
        console.log(`  ✅ Recalculated: "${place.name}"`)
      } catch (error) {
        console.error(`  ❌ Failed to recalculate score for "${place.name}":`, error)
      }
    }

    console.log(`\n✅ Recalculated scores for ${recalculatedCount}/${clearedFieldsCount} places`)
  }

  if (manualReviewPlaces.length > 0) {
    console.log('\n⚠️  MANUAL REVIEW RECOMMENDED (similarity between 0.3 and 0.7):\n')
    console.log('These places were cleaned but should be manually verified in case the Wikipedia match was actually correct:\n')

    for (const place of manualReviewPlaces) {
      console.log(`  🔍 Place: "${place.name}"`)
      console.log(`     ID: ${place.id}`)
      console.log(`     Wikipedia: "${place.wikipediaQuery}"`)
      console.log(`     Similarity: ${place.similarity.toFixed(2)}`)
      console.log('')
    }

    console.log(`Total cleaned places needing manual review: ${manualReviewPlaces.length}`)
  }

  console.log('\n✅ Cleanup complete!')
}

cleanInvalidWikipediaData().catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
