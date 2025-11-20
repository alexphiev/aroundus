export const OSM_SUPPORTED_TAGS: Record<string, string[]> = {
  // --- Tier 1: Prime Natural Destinations (The "Wow" Factor) ---
  // These are specific, high-value points of interest.

  natural: [
    'peak', // A mountain summit. Always relevant.
    'volcano', // A volcano. Always relevant.
    'gorge', // A deep, narrow valley. Prime destination.
    'canyon', // A large gorge. Prime destination.
    // 'cliff', // A vertical rock face. Almost always scenic.
    'cave_entrance', // The entrance to a cave. A clear destination.
    'glacier', // A glacier. Always a major natural feature.
    'waterfall', // A waterfall. One of the most sought-after features.
    // 'spring', // Especially relevant in France for named "Sources".
    'hot_spring', // Rare and interesting natural feature.
    'geyser', // Very rare and a major attraction.
    'beach', // A classic natural destination.
    'dune', // A sand dune.
    'cape', // A headland, often offering dramatic coastal views.
    'sinkhole', // Interesting geological depression (e.g., "gouffre").
    'ridge', // A long, narrow hilltop. Key feature for hikers.
    'saddle', // The lowest point on a ridge between two peaks.
  ],

  waterway: [
    'rapids', // A point of interest on a river.
  ],

  // --- Tier 2: Significant Natural Areas (The Context) ---
  // These are larger areas that are destinations in themselves.

  boundary: [
    'national_park', // Highest level of protection and significance.
    'protected_area', // Includes regional parks, etc. High relevance.
  ],

  leisure: [
    'nature_reserve', // Specifically designated for nature. Perfect fit.
    'park', // A park that will be filtered out by minArea
  ],

  landuse: [
    'forest', // A large area of managed woodland.
  ],

  water: [
    'lake', // A large body of water.
    'reservoir', // Often in scenic, natural settings.
    'lagoon', // Coastal saltwater body.
  ],

  place: [
    'island', // An island. Clearly a geographical destination.
    'islet',
  ],

  tourism: [
    'wilderness_hut', // A wilderness hut.
    'alpine_hut', // An alpine hut.
  ],

  route: [
    'hiking', // A hiking route.
    // 'bicycle', // A bicycle route. A bit too much noise. Not the focus of the app.
    // 'mtb', // A mountain bike route. A bit too much noise. Not the focus of the app.
  ],
}

export const OSM_FILTERS = {
  requireName: ['wood', 'forest', 'park', 'island'],

  minArea: {
    park: 50000,
    wood: 100000,
    forest: 100000,
  },

  requireTags: {
    hiking_route: ['ref'],
  },

  allowedSubtypes: {
    garden: ['botanical'],
  },

  boostIfInProtectedArea: ['beach', 'bay', 'wood', 'forest'],
}
