import { getPlaceById, updatePlace } from '@/services/db/places'
import { upsertWikipedia } from '@/services/db/wikipedia'
import { recalculateAndUpdateScores } from '@/services/score.service'
import { WikipediaData, wikipediaService } from '@/services/wikipedia.service'

export interface WikipediaAnalysisResult {
  placeId: string
  placeName: string
  wikipediaReference: string | null
  description: string | null
  wikipediaData: WikipediaData | null
}

export interface WikipediaAnalysisOptions {
  bypassCache?: boolean
}

/**
 * Core Wikipedia analysis logic - shared between API and scripts
 */
export async function analyzePlaceWikipediaCore(
  placeId: string,
  options: WikipediaAnalysisOptions = {},
): Promise<{ result?: WikipediaAnalysisResult; error?: string }> {
  try {
    // Fetch place from database
    const placeResponse = await getPlaceById(placeId)

    if (placeResponse.error || !placeResponse.data) {
      return {
        error: `Place not found: ${placeId}`,
      }
    }

    const place = placeResponse.data

    if (!place.name) {
      return {
        error: 'Place has no name to search Wikipedia',
      }
    }

    const bypassCache = options.bypassCache || false

    console.log(`📍 Analyzing place: ${place.name}`)

    if (bypassCache) {
      console.log(`🔄 Bypassing cache - will fetch fresh content`)
    }

    // Step 1: Fetch Wikipedia data
    console.log(`\n--- Step 1: Fetching Wikipedia Data ---`)
    let wikipediaData: WikipediaData | null = null
    let wikipediaReference: string | null = null

    // First check if place has a wikipedia field in metadata
    if (place.wikipedia_query) {
      console.log(`📚 Place has a Wikipedia reference: ${place.wikipedia_query}`)
      wikipediaReference = place.wikipedia_query
      wikipediaData = await wikipediaService.fetchWikipediaDataByReference(wikipediaReference)
    }

    // If no metadata wikipedia or fetch failed, try searching by place name
    if (!wikipediaData) {
      console.log(`🔍 No Wikipedia reference found or fetch failed, searching by place name...`)
      wikipediaData = await wikipediaService.searchWikipediaByPlaceName(place.name)
      if (wikipediaData) {
        // Construct reference from fetched data (always use French as default)
        const language = 'fr'
        wikipediaReference = `${language}:${wikipediaData.page_title}`
      }
    }

    if (!wikipediaData) {
      await updatePlace(place.id, {
        wikipedia_analyzed_at: new Date().toISOString(),
      })

      return {
        result: {
          placeId: place.id,
          placeName: place.name,
          wikipediaReference: null,
          description: null,
          wikipediaData: null,
        },
        error: 'No Wikipedia article found for this place. Try adding a Wikipedia reference in the place metadata.',
      }
    }

    // Step 2: Save Wikipedia data to database
    console.log(`\n--- Step 2: Saving Wikipedia Data to Database ---`)
    console.log(`   Page title: ${wikipediaData.page_title}`)
    console.log(`   Categories: ${wikipediaData.categories.length}`)

    const wikipediaDbResult = await upsertWikipedia({
      place_id: place.id,
      ...wikipediaData,
    })

    if (wikipediaDbResult.error) {
      console.error(`❌ Failed to save Wikipedia data to database:`)
      console.error(`   Error:`, wikipediaDbResult.error)
    } else {
      console.log(`✅ Wikipedia data saved to database successfully`)
    }

    // Step 3: Update place with basic Wikipedia info and timestamp
    const updateData: {
      wikipedia_query: string | null
      wikipedia_analyzed_at: string
    } = {
      wikipedia_query: wikipediaReference,
      wikipedia_analyzed_at: new Date().toISOString(),
    }

    const updateResult = await updatePlace(place.id, updateData)

    if (updateResult.error) {
      console.error(`❌ Failed to update place:`)
      console.error(`   Error:`, updateResult.error)
    } else {
      console.log(`✅ Place updated successfully`)

      // Recalculate scores after updating place data
      console.log(`\n--- Step 3.5: Recalculating Scores ---`)
      await recalculateAndUpdateScores(place.id)
    }

    return {
      result: {
        placeId: place.id,
        placeName: place.name,
        wikipediaReference: wikipediaReference,
        description: wikipediaData.first_paragraph,
        wikipediaData: wikipediaData,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      error: `Internal error: ${errorMessage}`,
    }
  }
}
