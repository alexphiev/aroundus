import { SCORE_CONFIG } from '@/services/score-config.service'

export function calculateGoogleRatingScore(
  rating: number | null | undefined,
  ratingCount: number | null | undefined,
): number {
  if (!rating || !ratingCount) return 0

  // Base score for having a rating
  const baseScore = SCORE_CONFIG.googleRating.hasRating

  // 1. Calculate the raw rating score (-2 to 10 scale)
  const ratingScore = calculateRatingScore(rating)

  // 2. Calculate confidence multiplier based on count (0 to 1)
  const confidence = calculateConfidence(ratingCount)

  // 3. Apply confidence weighting
  // Low confidence = pull score toward neutral (0)
  // High confidence = use full score
  const weightedScore = ratingScore * confidence

  return baseScore + weightedScore
}

function calculateRatingScore(rating: number): number {
  if (rating >= 4.7) return SCORE_CONFIG.googleRating.excellent // Excellent
  if (rating >= 4.4) return SCORE_CONFIG.googleRating.veryGood // Very good
  if (rating >= 4.1) return SCORE_CONFIG.googleRating.good // Good
  if (rating >= 3.8) return SCORE_CONFIG.googleRating.average // Average
  if (rating >= 3.5) return SCORE_CONFIG.googleRating.belowAverage // Below average
  if (rating >= 3.2) return SCORE_CONFIG.googleRating.poor // Poor
  return SCORE_CONFIG.googleRating.veryPoor // Very poor
}

function calculateConfidence(count: number): number {
  // Logarithmic confidence curve
  // 0 reviews = 0% confidence
  // 10 reviews = ~50% confidence
  // 100 reviews = ~75% confidence
  // 1000+ reviews = ~95% confidence

  if (count === 0) return 0
  if (count >= SCORE_CONFIG.googleRating.bestCount) return 1.0

  // Logarithmic scale: confidence = log(count + 1) / log(maxCount + 1)
  const maxCount = SCORE_CONFIG.googleRating.bestCount
  return Math.log(count + 1) / Math.log(maxCount + 1)
}
