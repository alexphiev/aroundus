import { getGeneratedPlaceById, getGeneratedPlacesWithoutStatus, updateGeneratedPlace } from '@/services/db/generated-places'
import { createPlace, getPlaceByOsmId, updatePlace } from '@/services/db/places'
import { getSourceById } from '@/services/db/sources'
import { recalculateAndUpdateScores } from '../services/score.service'
import { formatPlaceObject } from '@/services/utils/common'
import { overpassService } from '@/services/overpass.service'

export enum VerificationStatus {
  ADDED = 'ADDED',
  NO_MATCH = 'NO_MATCH',
  NO_NATURE_MATCH = 'NO_NATURE_MATCH',
  MULTIPLE_MATCHES = 'MULTIPLE_MATCHES',
}

export interface VerificationResult {
  generatedPlaceId: string
  generatedPlaceName: string
  status: VerificationStatus
  placeId?: string
  osmId?: number
  error?: string
}

export interface VerificationOptions {
  generatedPlaceId?: string
  limit?: number
}

/**
 * Search for a place in OSM by name and create/update a real place
 * Returns status and place information
 */
async function searchAndCreatePlace(
  placeName: string,
  description: string | null,
  sourceId: string,
  sourceUrl: string,
): Promise<{
  status: VerificationStatus
  placeId?: string
  osmId?: number
  error?: string
}> {
  try {
    // Search OSM for the place
    const searchResult = await overpassService.searchPlaceByName(placeName)

    // Check if Nominatim found results but none were nature places
    if (searchResult.noNatureMatch) {
      return {
        status: VerificationStatus.NO_NATURE_MATCH,
        error: 'Place found in OSM but is not a nature place',
      }
    }

    const osmElements = searchResult.elements
    if (!osmElements || osmElements.length === 0) {
      return { status: VerificationStatus.NO_MATCH, error: 'Place not found in OSM' }
    }

    // Process elements and find best match
    const processedPlaces = overpassService.processElements(osmElements)

    if (processedPlaces.length === 0) {
      return { status: VerificationStatus.NO_MATCH, error: 'No valid places found in OSM results' }
    }

    // If multiple matches found, mark as MULTIPLE_MATCHES
    if (processedPlaces.length > 1) {
      console.log(
        `⚠️  Multiple matches found for "${placeName}" (${processedPlaces.length} results) - requires manual review`,
      )
      return {
        status: VerificationStatus.MULTIPLE_MATCHES,
        error: `Multiple matches found: ${processedPlaces.length} results`,
      }
    }

    // Single match - proceed with verification
    const match = processedPlaces[0]

    // Verify name similarity to ensure it's a good match
    const normalizedPlaceName = placeName.toLowerCase().trim()
    const normalizedOsmName = match.name.toLowerCase().trim()

    let similarityScore = 0

    // Exact match
    if (normalizedOsmName === normalizedPlaceName) {
      similarityScore = 100
    }
    // Contains the place name
    else if (normalizedOsmName.includes(normalizedPlaceName) || normalizedPlaceName.includes(normalizedOsmName)) {
      similarityScore = 50
      // Prefer shorter names (more specific)
      if (normalizedOsmName.length < normalizedPlaceName.length + 10) {
        similarityScore += 20
      }
    }
    // Similarity based on common words
    else {
      const placeWords = normalizedPlaceName.split(/\s+/)
      const osmWords = normalizedOsmName.split(/\s+/)
      const commonWords = placeWords.filter((word) => osmWords.includes(word))
      similarityScore = (commonWords.length / Math.max(placeWords.length, osmWords.length)) * 30
    }

    // Require high confidence (at least 50) for a single match to be considered valid
    if (similarityScore < 50) {
      console.log(
        `⚠️  Low similarity score (${similarityScore}) for "${placeName}" → "${match.name}" - requires manual review`,
      )
      return {
        status: VerificationStatus.MULTIPLE_MATCHES,
        error: `Low confidence match: similarity score ${similarityScore}`,
      }
    }

    console.log(`✅ Found OSM match: ${match.name} (similarity: ${similarityScore}, OSM ID: ${match.osm_id})`)

    // Verify uniqueness by OSM ID before adding/updating
    const { data: existingPlace, error: findError } = await getPlaceByOsmId(String(match.osm_id))

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected, other errors are real issues
      console.error(`❌ Error checking for existing place:`, findError)
      return { status: VerificationStatus.NO_MATCH, error: `Database error: ${findError.message}` }
    }

    if (existingPlace) {
      // Place already exists with this OSM ID - update it instead of creating duplicate
      const wikipediaQuery = match.tags?.wikipedia || match.tags?.['wikipedia:fr'] || existingPlace.wikipedia_query
      const website = match.tags?.website || existingPlace.website

      // Update place with new data
      await updatePlace(existingPlace.id, {
        description: description || existingPlace.description,
        source_id: sourceId,
        wikipedia_query: wikipediaQuery || existingPlace.wikipedia_query,
        website: website || existingPlace.website,
      })

      // Note: Scores will be recalculated after generated_place is linked (in verifyPlacesCore)

      return { status: VerificationStatus.ADDED, placeId: existingPlace.id, osmId: match.osm_id }
    }

    // Create new place
    const wikipediaQuery = match.tags?.wikipedia || match.tags?.['wikipedia:fr'] || null
    const website = match.tags?.website || null

    const placeData = formatPlaceObject({
      source: sourceUrl,
      sourceId: sourceId,
      osm_id: String(match.osm_id),
      name: match.name,
      type: match.type,
      location: match.latitude && match.longitude ? `POINT(${match.longitude} ${match.latitude})` : null,
      geometry: match.geometry,
      description: description,
      website,
      wikipedia_query: wikipediaQuery,
      country: 'France', // Default, could be improved
    })

    // Insert the place
    const { data: newPlace, error: insertError } = await createPlace(placeData)

    if (insertError || !newPlace) {
      console.error(`❌ Error creating place:`, insertError)
      return {
        status: VerificationStatus.NO_MATCH,
        error: `Failed to create place: ${insertError?.message || 'Unknown error'}`,
      }
    }

    console.log(`✅ Created new place: ${newPlace.name}`)
    // Note: Scores will be recalculated after generated_place is linked (in verifyPlacesCore)

    return { status: VerificationStatus.ADDED, placeId: newPlace.id, osmId: match.osm_id }
  } catch (error) {
    console.error(`❌ Error searching/creating place "${placeName}":`, error)
    return { status: VerificationStatus.NO_MATCH, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Core place verification logic - shared between API and scripts
 */
export async function verifyPlacesCore(
  options: VerificationOptions = {},
): Promise<{ results: VerificationResult[]; error: string | null }> {
  try {
    const { generatedPlaceId, limit } = options

    let generatedPlaces: Array<{
      id: string
      name: string
      description: string | null
      source_id: string
    }> = []

    if (generatedPlaceId) {
      // Verify a single generated place
      const { data: place, error } = await getGeneratedPlaceById(generatedPlaceId)

      if (error || !place) {
        return {
          results: [],
          error: `Generated place not found: ${generatedPlaceId}`,
        }
      }

      // Check if place already has a status
      if (place.status) {
        return {
          results: [],
          error: `Generated place already has status "${place.status}" - requires special handling`,
        }
      }

      // Validate required fields
      if (!place.name || !place.source_id) {
        return {
          results: [],
          error: `Generated place missing required fields (name or source_id)`,
        }
      }

      generatedPlaces = [
        {
          id: place.id,
          name: place.name,
          description: place.description,
          source_id: place.source_id,
        },
      ]
    } else {
      // Get all generated places without status, sorted by oldest created_at first
      const places = await getGeneratedPlacesWithoutStatus(limit)
      // Filter places with required fields
      generatedPlaces = places
        .filter((p) => p.name && p.source_id)
        .map((p) => ({
          id: p.id,
          name: p.name!,
          description: p.description,
          source_id: p.source_id!,
        }))
    }

    if (generatedPlaces.length === 0) {
      return {
        results: [],
        error: 'No generated places found to verify (all places already have a status)',
      }
    }

    if (limit && !generatedPlaceId) {
      console.log(`\n⚠️  Limiting verification to ${limit} places (sorted by oldest created_at)`)
    }

    console.log(`\n🔍 Verifying ${generatedPlaces.length} generated place(s) (without status)...`)

    const results: VerificationResult[] = []

    for (const generatedPlace of generatedPlaces) {
      console.log(`\n--- Verifying: ${generatedPlace.name} ---`)

      // Get source URL for this place
      const sourceResponse = await getSourceById(generatedPlace.source_id)
      const sourceUrl = sourceResponse.data?.url || 'unknown'

      const verification = await searchAndCreatePlace(
        generatedPlace.name,
        generatedPlace.description,
        generatedPlace.source_id,
        sourceUrl,
      )

      // Update the generated place status and link it to the place
      await updateGeneratedPlace(generatedPlace.id, {
        status: verification.status,
        place_id: verification.placeId || null,
      })

      // Recalculate scores after linking generated_place to place (to include verification bonus)
      if (verification.placeId && verification.status === VerificationStatus.ADDED) {
        await recalculateAndUpdateScores(verification.placeId)
      }

      results.push({
        generatedPlaceId: generatedPlace.id,
        generatedPlaceName: generatedPlace.name,
        status: verification.status,
        placeId: verification.placeId,
        osmId: verification.osmId,
        error: verification.error,
      })
    }

    return {
      results,
      error: null,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      results: [],
      error: `Internal error: ${errorMessage}`,
    }
  }
}
