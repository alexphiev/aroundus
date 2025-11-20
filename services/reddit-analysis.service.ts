import { getPlaceById, updatePlace } from '@/services/db/places'
import { summarizeRedditContent } from '@/services/ai.service'
import { redditService } from '@/services/reddit.service'
import { recalculateAndUpdateScores } from '@/services/score.service'

export interface RedditAnalysisResult {
  placeId: string
  placeName: string
  description: string
  threadsCount: number
}

export interface RedditAnalysisOptions {
  bypassCache?: boolean
}

/**
 * Core Reddit analysis logic - shared between API and scripts
 */
export async function analyzePlaceRedditCore(
  placeId: string,
  options: RedditAnalysisOptions = {},
): Promise<{ result: RedditAnalysisResult; error?: string }> {
  try {
    // Fetch place from database
    const placeResponse = await getPlaceById(placeId)

    if (placeResponse.error || !placeResponse.data) {
      return {
        result: {
          placeId,
          placeName: 'Unknown',
          description: '',
          threadsCount: 0,
        },
        error: `Place not found: ${placeId}`,
      }
    }

    const place = placeResponse.data
    const bypassCache = options.bypassCache || false

    console.log(`📍 Analyzing place: ${place.name}`)

    if (!place.name) {
      return {
        result: {
          placeId: place.id,
          placeName: 'Unknown',
          description: '',
          threadsCount: 0,
        },
        error: 'Place has no name to search Reddit',
      }
    }

    if (bypassCache) {
      console.log(`🔄 Bypassing cache - will fetch fresh content`)
    }

    // Step 1: Check if already analyzed (unless bypassing cache)
    if (!bypassCache && place.reddit_analyzed_at && place.reddit_generated) {
      // Check if we have valid generated content
      if (
        place.reddit_generated &&
        !place.reddit_generated.includes('NO_RELEVANT_INFO') &&
        !place.reddit_generated.includes('not found')
      ) {
        const cachedData = place.reddit_data as any
        const threadsCount = cachedData?.threads?.length || 0
        console.log(`✅ Using cached Reddit analysis (analyzed at: ${place.reddit_analyzed_at})`)
        console.log(`📊 Cached data contains ${threadsCount} threads`)
        return {
          result: {
            placeId: place.id,
            placeName: place.name || 'Unknown',
            description: place.reddit_generated,
            threadsCount: threadsCount,
          },
        }
      }
    }

    // Step 2: Check cache or search Reddit
    console.log(`\n--- Step 1: Fetching Reddit Content ---`)
    let redditResult: { summary: string | null; rawData: any | null } | null = null

    // If bypassing cache, skip to fetching fresh data
    if (!bypassCache && place.reddit_data) {
      const cachedData = place.reddit_data as any
      if (cachedData && cachedData.threads && Array.isArray(cachedData.threads)) {
        console.log(`📊 Using cached Reddit raw data with ${cachedData.threads.length} threads`)

        // Regenerate summary from cached data if we don't have a good one
        if (
          !place.reddit_generated ||
          place.reddit_generated.includes('NO_RELEVANT_INFO') ||
          place.reddit_generated.includes('not found')
        ) {
          console.log(`🔄 Regenerating summary from cached data...`)
          const summary = await summarizeRedditContent(place.name || 'Unknown', {
            threads: cachedData.threads,
          })

          if (summary) {
            redditResult = {
              summary,
              rawData: cachedData,
            }
          } else {
            redditResult = {
              summary: 'NO_RELEVANT_INFO',
              rawData: cachedData,
            }
          }
        }
      }
    }

    // Fetch fresh Reddit data if bypassing cache or if we don't have a result yet
    if (bypassCache || !redditResult) {
      if (bypassCache) {
        console.log(`🔄 Cache bypassed, searching Reddit...`)
      } else {
        console.log(`🔍 No cache found, searching Reddit...`)
      }

      redditResult = await redditService.searchAndSummarizeRedditDiscussions(place.name, place.short_name || null)

      if (!redditResult) {
        return {
          result: {
            placeId: place.id,
            placeName: place.name || 'Unknown',
            description: '',
            threadsCount: 0,
          },
          error: 'Failed to search Reddit discussions.',
        }
      }

      // If no summary was generated, check if we have raw data
      if (!redditResult.summary && !redditResult.rawData) {
        return {
          result: {
            placeId: place.id,
            placeName: place.name || 'Unknown',
            description: '',
            threadsCount: 0,
          },
          error: 'No Reddit discussions found for this place.',
        }
      }

      // Store raw data in cache
      if (redditResult.rawData) {
        await updatePlace(place.id, { reddit_data: redditResult.rawData as any })
        console.log(`💾 Cached Reddit raw data`)
      }
    }

    // Step 2: Process summary
    if (!redditResult || !redditResult.summary) {
      return {
        result: {
          placeId: place.id,
          placeName: place.name || 'Unknown',
          description: '',
          threadsCount: 0,
        },
        error: 'Failed to generate Reddit summary. The discussions may not be relevant or AI service is unavailable.',
      }
    }

    // Step 3: Save results to database
    console.log(`\n--- Step 2: Saving Results to Database ---`)
    const threadsCount = redditResult.rawData?.threads?.length || 0
    console.log(`   Saving reddit_generated (${redditResult.summary.length} chars)`)
    console.log(`   Saving reddit_data (${threadsCount} threads)`)
    console.log(`   Saving reddit_analyzed_at timestamp`)

    const updateData: {
      reddit_generated: string
      reddit_data?: any
      reddit_analyzed_at: string
    } = {
      reddit_generated: redditResult.summary,
      reddit_analyzed_at: new Date().toISOString(),
    }

    if (redditResult.rawData) {
      updateData.reddit_data = redditResult.rawData
    }

    const updateResult = await updatePlace(place.id, updateData)

    if (updateResult.error) {
      // Log error but continue - we still have the results
      console.error(`❌ Failed to save results to database:`)
      console.error(`   Error:`, updateResult.error)
      console.error(`   Error message:`, updateResult.error.message)
      console.error(`   Error details:`, JSON.stringify(updateResult.error, null, 2))
    } else {
      console.log(`✅ Results saved to database successfully`)
      console.log(`   Updated place ID: ${place.id}`)

      // Recalculate scores after updating place data
      console.log(`\n--- Step 2.5: Recalculating Scores ---`)
      await recalculateAndUpdateScores(place.id)
    }

    return {
      result: {
        placeId: place.id,
        placeName: place.name || 'Unknown',
        description: redditResult.summary,
        threadsCount: threadsCount,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      result: {
        placeId,
        placeName: 'Unknown',
        description: '',
        threadsCount: 0,
      },
      error: `Internal error: ${errorMessage}`,
    }
  }
}
