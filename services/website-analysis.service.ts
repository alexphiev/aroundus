import { batchGetOrCreateGeneratedPlaces } from '@/services/db/generated-places'
import { getPlaceById, updatePlace } from '@/services/db/places'
import { getOrCreateSource } from '@/services/db/sources'
import { cleanText } from '@/services/utils/text-cleaner'
import { extractMentionedPlaces, summarizeScrapedContent } from '@/services/ai.service'
import { deepWebsiteScraperService } from '@/services/deep-website-scraper.service'
import { recalculateAndUpdateScores } from '@/services/score.service'

export interface WebsiteAnalysisResult {
  placeId: string
  placeName: string
  website: string | null
  description: string
  mentionedPlaces: string[]
  scrapedPagesCount: number
}

export interface WebsiteAnalysisOptions {
  bypassCache?: boolean
}

/**
 * Core website analysis logic - shared between API and scripts
 */
export async function analyzePlaceWebsiteCore(
  placeId: string,
  options: WebsiteAnalysisOptions = {},
): Promise<{ result: WebsiteAnalysisResult; error?: string }> {
  try {
    // Fetch place from database
    const placeResponse = await getPlaceById(placeId)

    if (placeResponse.error || !placeResponse.data) {
      return {
        result: {
          placeId,
          placeName: 'Unknown',
          website: null,
          description: '',
          mentionedPlaces: [],
          scrapedPagesCount: 0,
        },
        error: `Place not found: ${placeId}`,
      }
    }

    const place = placeResponse.data

    console.log(`📍 Analyzing place: ${place.name}`)
    console.log(`🌐 Website: ${place.website || 'N/A'}`)

    if (!place.website) {
      return {
        result: {
          placeId: place.id,
          placeName: place.name || 'Unknown',
          website: null,
          description: '',
          mentionedPlaces: [],
          scrapedPagesCount: 0,
        },
        error: 'Place has no website to analyze',
      }
    }

    const bypassCache = options.bypassCache || false

    if (bypassCache) {
      console.log(`🔄 Bypassing cache - will fetch fresh content`)
    }

    // Step 1: Check cache or scrape website
    console.log(`\n--- Step 1: Fetching Website Content ---`)
    let scrapedContent: string | null = null
    let pagesCount = 0

    if (!bypassCache && place.website_raw && place.website_raw.trim().length > 0) {
      console.log(`✅ Using cached website content (${place.website_raw.length} chars)`)
      scrapedContent = place.website_raw
      pagesCount = (scrapedContent.match(/=== Page \d+:/g) || []).length
    } else {
      if (bypassCache) {
        console.log(`🔄 Cache bypassed, scraping website...`)
      } else {
        console.log(`🔍 No cache found, scraping website...`)
      }
      scrapedContent = await deepWebsiteScraperService.scrapeWebsiteDeep(
        place.website,
        place.name || undefined,
        place.country || undefined,
      )

      if (!scrapedContent) {
        return {
          result: {
            placeId: place.id,
            placeName: place.name || 'Unknown',
            website: place.website,
            description: '',
            mentionedPlaces: [],
            scrapedPagesCount: 0,
          },
          error: 'Failed to scrape website. The site may have protections or be unavailable.',
        }
      }

      // Clean and store raw content
      const cleanedRawContent = cleanText(scrapedContent)
      pagesCount = (cleanedRawContent.match(/=== Page \d+:/g) || []).length
      scrapedContent = cleanedRawContent

      // Store cleaned raw content in cache
      await updatePlace(place.id, { website_raw: cleanedRawContent })
      console.log(`💾 Cached cleaned website content (${cleanedRawContent.length} chars)`)
    }

    console.log(`✅ Content ready: ${pagesCount} pages, ${scrapedContent.length} characters`)

    // Step 2: Two separate LLM calls - summarization and place extraction (done in parallel)
    console.log(`\n--- Step 2: Analyzing Content with AI ---`)
    console.log(`📝 Summarizing content...`)
    console.log(`📍 Extracting mentioned places...`)
    const [summary, mentionedPlaces] = await Promise.all([
      summarizeScrapedContent(place.name || 'Unknown Place', scrapedContent),
      extractMentionedPlaces(place.name || 'Unknown Place', scrapedContent),
    ])

    if (!summary) {
      return {
        result: {
          placeId: place.id,
          placeName: place.name || 'Unknown',
          website: place.website,
          description: '',
          mentionedPlaces: [],
          scrapedPagesCount: pagesCount,
        },
        error: 'Failed to summarize content. The website content may not be relevant or AI service is unavailable.',
      }
    }

    // Step 3: Save results to database
    console.log(`\n--- Step 3: Saving Results to Database ---`)
    console.log(`   Saving website_generated (${summary.length} chars)`)
    console.log(`   Saving website_places_generated (${mentionedPlaces.length} places)`)
    console.log(`   Saving website_raw (${scrapedContent.length} chars)`)
    console.log(`   Saving website_analyzed_at timestamp`)

    const updateResult = await updatePlace(place.id, {
      website_generated: summary,
      website_places_generated: mentionedPlaces,
      website_raw: scrapedContent,
      website_analyzed_at: new Date().toISOString(),
    })

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
      console.log(`\n--- Step 3.5: Recalculating Scores ---`)
      await recalculateAndUpdateScores(place.id)
    }

    // Step 4: Store source and generated places
    if (mentionedPlaces.length > 0 && place.website) {
      console.log(`\n--- Step 4: Storing Source and Generated Places ---`)
      try {
        // Get or create source for the website URL
        const sourceResponse = await getOrCreateSource(place.website)
        if (sourceResponse.error || !sourceResponse.data) {
          console.error(`❌ Failed to get or create source:`, sourceResponse.error)
        } else {
          const source = sourceResponse.data
          console.log(`✅ Source ID: ${source.id}`)

          // Store generated places linked to this source
          const placesToStore = mentionedPlaces.map((placeName) => ({
            name: placeName,
            description: null, // We don't have descriptions for mentioned places from website analysis
            source_id: source.id,
          }))

          const storedPlaces = await batchGetOrCreateGeneratedPlaces(placesToStore)
          console.log(`✅ Stored ${storedPlaces.length} generated places linked to source`)
        }
      } catch (error) {
        console.error(`❌ Error storing source and generated places:`, error)
        // Don't fail the whole operation if this step fails
      }
    }

    return {
      result: {
        placeId: place.id,
        placeName: place.name || 'Unknown',
        website: place.website,
        description: summary,
        mentionedPlaces: mentionedPlaces,
        scrapedPagesCount: pagesCount,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      result: {
        placeId,
        placeName: 'Unknown',
        website: null,
        description: '',
        mentionedPlaces: [],
        scrapedPagesCount: 0,
      },
      error: `Internal error: ${errorMessage}`,
    }
  }
}
