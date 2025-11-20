import { batchUpdatePlaceScores, getPlacesCount, getPlacesForScoreCalculation, PlaceWithScoreData } from '@/db/places'
import 'dotenv/config'
import { calculateScore } from '@/services/score.service'
import { retryAsync } from '@/utils/retry'

async function getPlacesWithRetry(
  limit: number,
  offset: number,
  maxScoreUpdatedAt?: Date,
): Promise<{ data: PlaceWithScoreData[] | null; error: any }> {
  return retryAsync(
    () => getPlacesForScoreCalculation(limit, offset, maxScoreUpdatedAt),
    'Fetch places',
  )
}

interface ScoreRecalculationResult {
  placeId: string
  placeName: string
  previousSourceScore: number
  newSourceScore: number
  previousEnhancementScore: number
  newEnhancementScore: number
  previousTotalScore: number
  newTotalScore: number
  hasChanges: boolean
}

async function recalculateScores() {
  console.log('🧮 Score Recalculation Script')
  console.log('=============================\n')

  const maxScoringDateArg = process.argv[2]
  let maxScoringDate: Date | null = null

  if (maxScoringDateArg) {
    const [day, month, year] = maxScoringDateArg.split('/')
    maxScoringDate = new Date(`${year}-${month}-${day}`)

    if (isNaN(maxScoringDate.getTime())) {
      console.error('❌ Invalid date format. Use DD/MM/YYYY')
      process.exit(1)
    }

    console.log(`📅 Only recalculating places with scores updated before: ${maxScoringDate.toLocaleDateString()}\n`)
  }

  try {
    const { count: totalPlaces, error: countError } = await getPlacesCount(maxScoringDate || undefined)

    if (countError || totalPlaces === null) {
      console.error('❌ Error fetching places count:', countError)
      process.exit(1)
    }

    console.log(`📊 Total places to process: ${totalPlaces.toLocaleString()}\n`)

    const BATCH_SIZE = 1000
    let updatedCount = 0
    let totalProcessed = 0
    let hasMore = true

    while (hasMore) {
      const { data: places, error } = await getPlacesWithRetry(BATCH_SIZE, 0, maxScoringDate || undefined)

      if (error) {
        console.error('❌ Error fetching places:', error)
        process.exit(1)
      }

      if (!places || places.length === 0) {
        break
      }

      // Process places in parallel with concurrency control
      const CONCURRENT_LIMIT = 10
      const updates: ScoreRecalculationResult[] = []

      for (let i = 0; i < places.length; i += CONCURRENT_LIMIT) {
        const chunk = places.slice(i, i + CONCURRENT_LIMIT)
        const chunkResults = await Promise.all(
          chunk.map(async (place) => {
            totalProcessed++

            const previousSourceScore = place.source_score || 0
            const previousEnhancementScore = place.enhancement_score || 0
            const previousTotalScore = place.score || 0

            const scoreCalculation = await calculateScore(place)
            const newSourceScore = scoreCalculation.sourceScore
            const newEnhancementScore = scoreCalculation.enhancementScore
            const newTotalScore = scoreCalculation.totalScore

            const hasChanges =
              previousSourceScore !== newSourceScore ||
              previousEnhancementScore !== newEnhancementScore ||
              previousTotalScore !== newTotalScore

            if (hasChanges) {
              updatedCount++
            }

            return {
              placeId: place.id,
              placeName: place.name || 'Unknown',
              previousSourceScore,
              newSourceScore,
              previousEnhancementScore,
              newEnhancementScore,
              previousTotalScore,
              newTotalScore,
              hasChanges,
            }
          }),
        )

        updates.push(...chunkResults)
      }

      if (updates.length > 0) {
        const { error } = await batchUpdatePlaceScores(
          updates.map((update) => ({
            id: update.placeId,
            sourceScore: update.newSourceScore,
            enhancementScore: update.newEnhancementScore,
            totalScore: update.newTotalScore,
          })),
        )

        if (error) {
          console.error(`❌ Batch update failed: ${error.message}`)
        }
      }

      console.log(`Processed ${totalProcessed.toLocaleString()}/${totalPlaces.toLocaleString()}`)

      // Check if we got fewer results than the batch size
      if (places.length < BATCH_SIZE) {
        hasMore = false
      }
    }

    console.log('\n📊 Recalculation Summary:')
    console.log('========================')
    console.log(`Total places checked: ${totalProcessed.toLocaleString()}`)
    console.log(`Places with score updates: ${updatedCount.toLocaleString()}`)
    console.log('\n🎉 Score recalculation completed!')
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

// Run the script
recalculateScores().catch(console.error)
