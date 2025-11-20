import { calculateGoogleRatingScore } from '@/services/utils/score.utils'
import { hasGeneratedPlace } from '@/services/db/generated-places'
import { hasPlacePhotos } from '@/services/db/place-photos'
import { getPlaceById, PlaceWithScoreData, updatePlaceScoresFromCalculation } from '@/services/db/places'
import { getWikipediaByPlaceId } from '@/services/db/wikipedia'
import { Tables } from '@/services/types/supabase'
import { SCORE_CONFIG } from '@/services/score-config.service'

type Place = Tables<'places'>

export interface ScoreCalculation {
  sourceScore: number
  enhancementScore: number
  totalScore: number
}

/**
 * Check if an enhancement field contains valid content
 */
export function isValidEnhancement(field: string | null): boolean {
  if (!field) return false
  if (field === 'not found') return false
  if (field.includes('NO_RELEVANT_INFO')) return false
  return true
}

/**
 * Centralized score calculation function
 * Calculates all scores for a place based on its current state
 * Accepts pre-loaded data to avoid extra DB queries when available
 */
export async function calculateScore(place: Place | PlaceWithScoreData): Promise<ScoreCalculation> {
  let sourceScore = SCORE_CONFIG.base

  if (place.type === 'national_park') {
    sourceScore = SCORE_CONFIG.nationalPark
  } else if (place.type === 'regional_park') {
    sourceScore = SCORE_CONFIG.regionalPark
  }

  const placeWithData = place as PlaceWithScoreData
  const isVerified = placeWithData.generated_places
    ? placeWithData.generated_places.length > 0
    : await hasGeneratedPlace(place.id)

  if (isVerified) {
    sourceScore += SCORE_CONFIG.isGeneratedPlaceVerified
  }

  let enhancementScore = 0

  if (place.website) {
    enhancementScore += SCORE_CONFIG.hasWebsite
  }

  if (isValidEnhancement(place.reddit_generated)) {
    enhancementScore += SCORE_CONFIG.hasRedditArticles
  }

  if (placeWithData.wikipedia !== undefined) {
    if (placeWithData.wikipedia?.score) {
      enhancementScore += Number(placeWithData.wikipedia.score)
    }
  } else {
    const { data: wikipediaData, error: wikipediaError } = await getWikipediaByPlaceId(place.id)
    if (wikipediaError) {
      console.error(`❌ Error fetching Wikipedia data for place ${place.id}:`, wikipediaError)
    } else if (wikipediaData?.score) {
      enhancementScore += Number(wikipediaData.score)
    }
  }

  const hasPhotos = placeWithData.place_photos ? placeWithData.place_photos.length > 0 : await hasPlacePhotos(place.id)

  if (hasPhotos) {
    enhancementScore += SCORE_CONFIG.hasPhotos
  }

  if (place.google_rating && place.google_rating_count) {
    enhancementScore += calculateGoogleRatingScore(place.google_rating, place.google_rating_count)
  }

  const totalScore = sourceScore + enhancementScore

  return {
    sourceScore,
    enhancementScore,
    totalScore,
  }
}

/**
 * Recalculates and updates scores for a place
 * Fetches the latest place data, calculates scores, and updates the database
 * @param placeId The ID of the place to recalculate scores for
 * @returns The calculated scores, or null if the operation failed
 */
export async function recalculateAndUpdateScores(placeId: string): Promise<ScoreCalculation | null> {
  try {
    const { data: updatedPlace, error: fetchError } = await getPlaceById(placeId)

    if (fetchError || !updatedPlace) {
      console.error(`❌ Failed to fetch updated place for score recalculation:`, fetchError)
      return null
    }

    const scores = await calculateScore(updatedPlace)
    const updateResult = await updatePlaceScoresFromCalculation(placeId, scores)

    if (updateResult.error) {
      console.error(`❌ Failed to update scores:`, updateResult.error)
      return null
    }

    console.log(
      `✅ Scores recalculated: source=${scores.sourceScore}, enhancement=${scores.enhancementScore}, total=${scores.totalScore}`,
    )

    return scores
  } catch (error) {
    console.error(`❌ Error recalculating scores:`, error)
    // Don't fail the whole operation if score recalculation fails
    return null
  }
}
