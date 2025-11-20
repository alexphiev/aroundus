/**
 * Score Configuration Service
 *
 * Centralizes all score values to avoid magic numbers throughout the codebase.
 * All score-related values should be retrieved from here.
 */
export const SCORE_CONFIG = {
  base: 1,
  regionalPark: 8,
  nationalPark: 10,
  wikipedia: {
    hasPage: 2,
    pageViews: {
      high: 3,
      medium: 2,
      low: 1,
    },
    languageVersions: {
      high: 2,
      medium: 1,
      low: 0.5,
    },
  },
  hasWebsite: 2,
  hasRedditArticles: 2,
  hasPhotos: 2,
  isGeneratedPlaceVerified: 2,
  googleRating: {
    hasRating: 1,
    bestCount: 2000,
    excellent: 8,
    veryGood: 6,
    good: 4,
    average: 0,
    belowAverage: -1,
    poor: -2,
    veryPoor: -4,
  },
}
