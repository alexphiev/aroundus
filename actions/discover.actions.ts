'use server'

import { MODEL } from '@/constants/ai.constants'
import { getAIError, getGenAI } from '@/services/ai.service'
import { authenticateUser } from '@/services/auth.service'
import { enrichPlaceWithGoogleData } from '@/services/google-places.service'
import type {
  DiscoverError,
  DiscoverResult,
  MinimalPlaceContext,
  OptimizedSearchContext,
  PlaceResultItem,
  UserPreferences,
} from '@/types/result.types'
import { DiscoverErrorType } from '@/types/result.types'
import {
  createDiscoverError,
  validateDiscoverySubmission,
} from '@/utils/discover.utils'
import { type DiscoverySubmissionValues } from '@/validation/discover-form.validation'
import { GenerateContentResponse } from '@google/genai'
import { getWeatherDataForAI } from './weather.actions'

// Helper function to extract text from AI response with simplified fallbacks
function extractResponseText(result: GenerateContentResponse): string {
  // Type guard for expected response structure
  const isValidCandidate = (
    candidate: unknown
  ): candidate is { content: { parts: { text: string }[] } } => {
    return (
      typeof candidate === 'object' &&
      candidate !== null &&
      'content' in candidate &&
      typeof candidate.content === 'object' &&
      candidate.content !== null &&
      'parts' in candidate.content &&
      Array.isArray(candidate.content.parts) &&
      candidate.content.parts.length > 0 &&
      typeof candidate.content.parts[0] === 'object' &&
      candidate.content.parts[0] !== null &&
      'text' in candidate.content.parts[0] &&
      typeof candidate.content.parts[0].text === 'string'
    )
  }

  // Check standard response structure
  if (
    typeof result === 'object' &&
    result !== null &&
    'candidates' in result &&
    Array.isArray(result.candidates) &&
    result.candidates.length > 0
  ) {
    const candidate = result.candidates[0]
    if (isValidCandidate(candidate)) {
      return candidate.content.parts[0].text
    }
  }

  // Check for alternative text property
  if (
    typeof result === 'object' &&
    result !== null &&
    'text' in result &&
    typeof result.text === 'string'
  ) {
    return result.text
  }

  throw new Error('No valid text content found in AI response')
}

// Helper function to extract JSON from response text
function extractJsonFromText(responseText: string): unknown {
  const cleanedText = responseText.trim()

  // Try to find JSON block markers first
  const jsonBlockRegex = /```(?:json)?\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*```/
  const jsonBlockMatch = cleanedText.match(jsonBlockRegex)

  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1])
    } catch {
      // Continue to other methods if JSON block parsing fails
    }
  }

  // Try to find JSON array/object directly
  const arrayMatch = cleanedText.match(/\[[\s\S]*?\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch {
      // Continue to other methods
    }
  }

  const objectMatch = cleanedText.match(/\{[\s\S]*?\}/)
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0])
    } catch {
      // Continue to other methods
    }
  }

  // If all else fails, try parsing the entire text
  try {
    return JSON.parse(cleanedText)
  } catch {
    throw new Error(
      `Failed to extract valid JSON from response: ${cleanedText.substring(0, 200)}...`
    )
  }
}

// Improved executeDiscoverPrompt with better error handling
async function executeDiscoverPrompt(
  prompt: string,
  modelName: string
): Promise<PlaceResultItem[]> {
  const genAI = getGenAI()
  if (!genAI) {
    throw createDiscoverError(
      DiscoverErrorType.AI_SERVICE_ERROR,
      'AI service is not available',
      undefined,
      true,
      'AI service is temporarily unavailable. Please try again later.'
    )
  }

  const contents = [{ role: 'user', parts: [{ text: prompt }] }]

  try {
    // First attempt with grounding tools
    const result = await genAI.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        tools: [{ googleSearch: {} }],
      },
    })

    let responseText: string
    try {
      responseText = extractResponseText(result)
    } catch (extractError) {
      // Retry without grounding tools if text extraction fails
      console.warn('First attempt failed, retrying without grounding tools...')

      try {
        const fallbackResult = await genAI.models.generateContent({
          model: modelName,
          contents: contents,
          // No tools for fallback
        })

        responseText = extractResponseText(fallbackResult)
      } catch (fallbackError) {
        throw createDiscoverError(
          DiscoverErrorType.AI_RESPONSE_ERROR,
          'Failed to extract response from AI after multiple attempts',
          { originalError: extractError, fallbackError },
          true,
          'AI response was malformed. Please try again.'
        )
      }
    }

    // Parse JSON from response
    let parsedResponse: unknown
    try {
      parsedResponse = extractJsonFromText(responseText)
    } catch (jsonError) {
      throw createDiscoverError(
        DiscoverErrorType.AI_PARSING_ERROR,
        'Failed to parse JSON from AI response',
        { responseText: responseText.substring(0, 500), error: jsonError },
        true,
        'AI response was not in the expected format. Please try again.'
      )
    }

    // Validate that response is an array
    if (!Array.isArray(parsedResponse)) {
      throw createDiscoverError(
        DiscoverErrorType.AI_PARSING_ERROR,
        'AI response is not an array',
        { responseType: typeof parsedResponse },
        true,
        'AI response was not in the expected format. Please try again.'
      )
    }

    return parsedResponse as PlaceResultItem[]
  } catch (error) {
    // If it's already a DiscoverError, re-throw it
    if (typeof error === 'object' && error !== null && 'type' in error) {
      throw error
    }

    // Handle network/API errors
    if (error instanceof Error) {
      if (
        error.message.includes('network') ||
        error.message.includes('timeout')
      ) {
        throw createDiscoverError(
          DiscoverErrorType.NETWORK_ERROR,
          'Network error occurred while contacting AI service',
          error,
          true,
          'Network error. Please check your connection and try again.'
        )
      }

      throw createDiscoverError(
        DiscoverErrorType.AI_SERVICE_ERROR,
        error.message,
        error,
        true,
        'AI service error. Please try again later.'
      )
    }

    throw createDiscoverError(
      DiscoverErrorType.UNKNOWN_ERROR,
      'An unexpected error occurred',
      error,
      true,
      'An unexpected error occurred. Please try again.'
    )
  }
}

// Helper function to convert places to minimal context
function convertToMinimalContext(
  places: PlaceResultItem[]
): MinimalPlaceContext[] {
  return places.map((place) => ({
    name: place.name,
    lat: place.lat,
    long: place.long,
    landscape: place.landscape || 'park',
    activity: place.activity || 'walking',
    userFeedback: place.userFeedback,
  }))
}

// Helper function to extract user preferences from place feedback
function extractUserPreferences(
  places: MinimalPlaceContext[]
): UserPreferences {
  const likedPlaces = places.filter((p) => p.userFeedback === 'liked')
  const dislikedPlaces = places.filter((p) => p.userFeedback === 'disliked')

  const likedLandscapes = [
    ...new Set(likedPlaces.map((p) => p.landscape).filter(Boolean)),
  ]
  const dislikedLandscapes = [
    ...new Set(dislikedPlaces.map((p) => p.landscape).filter(Boolean)),
  ]
  const likedActivities = [
    ...new Set(likedPlaces.map((p) => p.activity).filter(Boolean)),
  ]
  const dislikedActivities = [
    ...new Set(dislikedPlaces.map((p) => p.activity).filter(Boolean)),
  ]

  return {
    likedLandscapes,
    dislikedLandscapes,
    likedActivities,
    dislikedActivities,
    likedPlaces,
    dislikedPlaces,
  }
}

// Helper function to generate balanced and diverse criteria
function generateUserContext(context: OptimizedSearchContext): string {
  const { previousPlaces, userPreferences } = context

  // --- 1. Hard Constraints (Unchanged) ---
  // This is a good use of a hard rule.
  const locationAvoidance = previousPlaces
    .map(
      (place) =>
        `- NEVER suggest locations within 5km of ${place.name} (coordinates: ${place.lat}, ${place.long}). This includes similar places, nearby trails, or variations of the same location.`
    )
    .join('\n    ')

  // --- 2. Nuanced Guidance from User Feedback ---
  let preferenceGuidance = ''

  // Use liked places as a vector for inspiration, not a rule.
  if (userPreferences.likedPlaces.length > 0) {
    const likedExamples = userPreferences.likedPlaces
      .map(
        (p) =>
          `"${p.name}" (landscape: ${p.landscape}, activity: ${p.activity})`
      )
      .join(', ')
    preferenceGuidance += `
    - **INSPIRATION FROM POSITIVE FEEDBACK:** The user enjoyed ${likedExamples}. Use these as inspiration and not as strict rules to find recommendations that are **related but distinct**. For example, if they liked a mountain hike, suggest a volcanic crater trail or a coastal cliff walk, not just another mountain hike.`
  }

  // Generalize from disliked places to infer underlying preferences.
  if (userPreferences.dislikedPlaces.length > 0) {
    const dislikedExamples = userPreferences.dislikedPlaces
      .map(
        (p) =>
          `"${p.name}" (landscape: ${p.landscape}, activity: ${p.activity})`
      )
      .join(', ')
    preferenceGuidance += `
    - **LEARNED CONSTRAINTS FROM NEGATIVE FEEDBACK:** The user disliked ${dislikedExamples}. Infer the underlying disliked attributes (e.g., crowded, touristy, noisy, specific landscapes) and avoid places with those characteristics when relevant only.`
  }

  // --- 3. Explicit Instructions for Exploration & Diversity ---
  const explorationInstructions = `
    - **PROMOTE DIVERSITY:** Each recommendation must be distinctly different from all previous suggestions. Vary landscapes, activities, location or characteristics.
    - **GEOGRAPHIC SPREAD:** Suggest places in different directions and regions from previous recommendations to maximize exploration coverage.
    - **ACTIVITY VARIATION:** If previous suggestions focused on one type of activity, expand to different but compatible activities within the user's preferences.
    - **FOCUS ON NOVELTY:** The primary goal is to help the user discover **completely new** experiences. Avoid any place that could be considered similar, nearby, or a variation of previous suggestions.
    - **STRICT UNIQUENESS:** Every recommendation must offer a genuinely different experience from what has been suggested before.`

  return `
    SEARCH OPTIMIZATION INSTRUCTIONS (BATCH ${context.batchNumber}):
    
    **Primary Goal:** Provide a diverse and novel set of recommendations that expands on the user's known preferences. Balance familiar concepts with new discoveries.
    
    **1. Duplication Avoidance (Hard Rule):**
    ${locationAvoidance}
    
    **2. User Preference Guidance (Inspirational):**
    ${preferenceGuidance}
    
    **3. Exploration and Discovery (Core Mandate):**
    ${explorationInstructions}
  `
}

// Server action for batch search that gets 4 results at a time
export async function handlePlaceSearchBatch(
  data: DiscoverySubmissionValues,
  batchNumber: number = 1,
  searchContext: OptimizedSearchContext | null = null
): Promise<DiscoverResult<PlaceResultItem[]>> {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return {
      success: false,
      error: createDiscoverError(
        DiscoverErrorType.AUTH_ERROR,
        authResult.error,
        undefined,
        false,
        'Please sign in to search for places.'
      ),
    }
  }

  // Validate incoming data
  const validationResult = validateDiscoverySubmission(data)
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error,
    }
  }

  const validatedData = validationResult.data!
  const {
    activity,
    activityDurationValue,
    activityDurationUnit,
    activityLevel,
    distance,
    transportType,
    locationName,
    location,
    specialCare,
    when,
    additionalInfo,
  } = validatedData

  console.log({ validatedData })

  // Check AI availability
  if (!getGenAI()) {
    return {
      success: false,
      error: createDiscoverError(
        DiscoverErrorType.AI_SERVICE_ERROR,
        getAIError() || 'AI service unavailable',
        undefined,
        true,
        'AI service is temporarily unavailable. Please try again later.'
      ),
    }
  }

  const modelName = MODEL.GEMINI_FLASH

  // Parse when field to get target date
  const getTargetDate = (when: string) => {
    const now = new Date()
    switch (when) {
      case 'today':
        return now
      case 'tomorrow':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000)
      case 'this_weekend':
        const daysUntilSaturday = 6 - now.getDay()
        return new Date(now.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000)
      default:
        try {
          return new Date(when)
        } catch {
          return now
        }
    }
  }

  const targetDate = when ? getTargetDate(when) : null

  // Get weather forecast for the target location and date
  const weatherData = await getWeatherDataForAI(
    location.latitude,
    location.longitude,
    targetDate || new Date()
  )

  // Create special care requirements text
  const specialCareRequirements = []
  if (specialCare === 'children') {
    specialCareRequirements.push(
      '- CHILD-FRIENDLY: Must be safe and suitable for children, with easy trails, no dangerous cliffs/drops, and engaging activities'
    )
  }
  if (specialCare === 'lowMobility') {
    specialCareRequirements.push(
      '- ACCESSIBILITY: Must be accessible for people with limited mobility (paved paths, minimal elevation, wheelchair accessible where possible)'
    )
  }
  if (specialCare === 'dogs') {
    specialCareRequirements.push(
      '- DOG-FRIENDLY: Must allow dogs, have leash-friendly trails, and provide water sources'
    )
  }

  // Create transport method description
  const getTransportDescription = (transportType: string) => {
    switch (transportType) {
      case 'foot':
        return 'traveling on foot/walking'
      case 'bike':
        return 'traveling by bicycle'
      case 'public_transport':
        return 'using public transport (buses, trains, metro)'
      case 'car':
        return 'traveling by car'
      default:
        return 'using any available transport method'
    }
  }

  // Create optimized context from previous search results
  const currentContext: OptimizedSearchContext = {
    previousPlaces: searchContext?.previousPlaces || [],
    userPreferences: searchContext?.userPreferences || {
      likedLandscapes: [],
      dislikedLandscapes: [],
      likedActivities: [],
      dislikedActivities: [],
      likedPlaces: [],
      dislikedPlaces: [],
    },
    batchNumber,
  }

  // Generate optimized avoidance and preference criteria
  const userContext = generateUserContext(currentContext)

  // Base criteria for all prompts
  const baseCriteria = `
    STRICT REQUIREMENTS:
    - Preferred activity type: ${activity}
    ${
      targetDate
        ? `- Visit date: ${targetDate.toDateString()} (${targetDate.toLocaleDateString(
            'en-US',
            { weekday: 'long' }
          )})`
        : ''
    }
    - Desired travel time range to location: ${distance} (ONE WAY)
    - Preferred transport method: ${getTransportDescription(transportType)}
    ${activityDurationValue && activityDurationUnit ? `- Desired activity duration at location: ${activityDurationValue} ${activityDurationUnit}` : ''}
    ${activityLevel ? `- Physical activity level: ${activityLevel} (where 1 is very light and 5 is very strenuous)` : ''}
    - Starting location: ${locationName} (latitude ${location.latitude}, longitude ${location.longitude})
    
    ${
      specialCareRequirements.length > 0
        ? `SPECIAL CARE REQUIREMENTS:
    ${specialCareRequirements.join('\n    ')}
    `
        : ''
    }
    
    TRANSPORT & ACCESSIBILITY:
    - Consider destinations that are accessible via ${getTransportDescription(
      transportType
    )}
    - Factor in parking availability, public transport stops, or bike-friendly routes as appropriate
    - Account for the practicality of reaching the destination with the chosen transport method
    - For walking/biking: suggest closer destinations and consider trail access points
    - For public transport: ensure destinations are near transit stops or accessible via transit
    - For car travel: consider parking availability and road accessibility
    
    TIMING CONSIDERATIONS:
    - Please consider the visit date for seasonal activities, weather patterns, and accessibility
    - Account for weekend vs weekday crowd levels and suggest timing accordingly
    - Consider any potential public holidays or local events that might affect crowds
    - Recommend seasonal activities appropriate for the time of year
    - Factor in weather conditions typical for this season in the region
    
    CURRENT WEATHER FORECAST:
    ${weatherData}
    
    WEATHER-BASED RECOMMENDATIONS:
    - Use the weather forecast above to suggest activities suitable for the predicted conditions
    - For rainy weather: prioritize indoor attractions, covered areas, or activities that work well in rain
    - For sunny weather: suggest outdoor activities and recommend sun protection
    - For cold weather: suggest activities with warming options or shorter outdoor exposure
    - For hot weather: recommend activities with shade, water features, or early morning/evening timing
    - Consider wind conditions for activities like cycling, photography, or water sports
    - Factor in precipitation chances when recommending specific times of day
    - Adjust activity duration recommendations based on weather comfort levels
    
    ${
      activityDurationValue && activityDurationUnit
        ? `CRITICAL: You must strictly adhere to the duration criteria. For activity duration of ${activityDurationValue} ${activityDurationUnit}:
    - If specified in hours: suggest activities that take between ${Math.max(
      1,
      activityDurationValue - 1
    )} and ${activityDurationValue + 1} hours
    - If specified in days: suggest activities that take between ${Math.max(
      1,
      activityDurationValue - 1
    )} and ${activityDurationValue + 1} days
    `
        : ''
    }
    For travel distance preference of ${distance} via ${getTransportDescription(
      transportType
    )}:
    - Suggest places that fall within the user's preferred travel time range: ${distance} from ${locationName} (coordinates: ${location.latitude}, ${location.longitude}) using ${getTransportDescription(
      transportType
    )}
    - Understand this as a range preference, not a strict maximum - the user wants destinations that match their ideal travel time
    - For "less than" ranges: prioritize closer destinations but can include places up to that time
    - For "between" ranges: focus on destinations that fall within that specific time window
    - Use Google Search to verify actual travel times from the starting location to match the user's distance preference
    - Consider realistic routes, traffic patterns, and connections for the chosen transport method
    - Factor in any transport-specific limitations (bike paths, transit schedules, parking requirements)
    
    ACTIVITY FOCUS: Prioritize locations and experiences that align with "${activity}" activities.
    
    ${
      additionalInfo
        ? `
    🔥 CRITICAL USER REQUEST - HIGHEST PRIORITY:
    The user specifically searched for: "${additionalInfo}"
    
    This is the user's direct input and represents their PRIMARY desire for this place. 
    You MUST prioritize this request above all other criteria. Every suggestion should strongly align with this user input.
    Use this as the main filter and inspiration for your recommendations.
    `
        : ''
    }
    
    ${userContext}
    
    ${
      specialCareRequirements.length > 0
        ? 'IMPORTANT: All suggestions must strictly comply with the special care requirements listed above.'
        : ''
    }
  `

  const responseFormat = `
    🌿 NATURE-ONLY VALIDATION: Before suggesting any place, verify it is 100% natural and outdoor-focused. Reject any place that has primarily artificial, commercial, or indoor elements.
    
    For each NATURAL suggestion, provide these details:
    - name: A catchy and descriptive name for the NATURAL spot/activity (emphasize natural features)
    - description: A brief, engaging description (2-3 sentences) highlighting the NATURAL elements, outdoor activities, and how to get there. Focus on trees, water, rocks, wildlife, natural terrain, and scenic beauty.
    - lat: The precise latitude of the starting point of the activity (use Google Search to find exact coordinates with full precision, e.g., 40.594721)
    - long: The precise longitude of the starting point of the activity (use Google Search to find exact coordinates with full precision, e.g., -4.156937)
    - landscape: Must be ONE of these NATURAL categories: "mountain", "forest", "lake", "beach", "river", "park", "wetland", "desert"
    - activity: Must be ONE of these NATURE activities: "hiking", "biking", "camping", "photography", "wildlife", "walking", "swimming"
    - estimatedActivityDuration: The estimated time range for the outdoor activity (e.g., "1-4 hours", "2-3 days")
    - estimatedTransportTime: The estimated one-way travel time from starting location (e.g., "45 minutes", "2 hours")
    - transportMode: The primary transport mode used (must be one of: "foot", "bike", "public_transport", "car")
    - starRating: Rate from 1-3 stars based on how well this NATURAL destination fulfills the user's specific request (3 = perfect match and must-go, 2 = very good match, 1 = good option but less ideal)
    - starRatingReason: A comprehensive explanation (2-3 sentences) combining both why you recommend this NATURAL place and why you gave it this specific star rating. Explain how well it matches the user's criteria (activity type, distance, duration, special requirements), highlight the place's natural qualities and outdoor features, and justify the rating based on overall fit and natural beauty
    - bestTimeToVisit: Recommended time range for optimal OUTDOOR experience based on the weather forecast and crowds (e.g., "8:00 AM - 11:00 AM before rain starts", "early morning when clear skies", "afternoon after 2 PM when temperatures cool")
    - timeToAvoid: Times or conditions to avoid for OUTDOOR activities (e.g., "midday during rain", "weekends 10 AM-4 PM", "avoid if temperature below 5°C")
    
    CRITICAL: For coordinates, use Google Search to find the exact latitude and longitude of each NATURAL location. 
    Provide coordinates with full precision (6 decimal places minimum) - do not round or truncate them.
    
    CRITICAL: Every single suggestion MUST be a natural outdoor place. If you cannot find 4 natural places that meet the criteria, return fewer suggestions rather than including non-natural places.
    
    CRITICAL: Return ONLY a valid JSON array with NO additional text, explanations, introductions, or markdown formatting.
    Start your response immediately with [ and end with ].
    Format: [{"name": "...", "description": "...", "transportMode": "...", "starRating": number, "starRatingReason": "...", ...}]
  `

  try {
    // Create a simpler prompt that requests 4 high-quality destinations
    const prompt = `
      You are an expert nature concierge specializing EXCLUSIVELY in natural outdoor destinations. Find 4 excellent NATURE destinations near ${locationName} that match the user's criteria.
      
      🌿 CRITICAL NATURE-ONLY REQUIREMENT:
      You MUST ONLY suggest natural outdoor places. This app is exclusively for nature discovery and outdoor experiences.
      
      ✅ ACCEPTABLE NATURE PLACES (Examples):
      - Natural forests, woodlands, and tree groves
      - Mountains, hills, cliffs, and rocky outcrops  
      - Natural lakes, ponds, rivers, streams, and waterfalls
      - Ocean beaches, natural coastlines, and seaside cliffs
      - Natural parks with hiking trails, meadows, and wildlife
      - Wetlands, marshes, and nature reserves
      - Deserts, canyons, and natural geological formations
      - Nature trails through wilderness areas
      - Natural swimming holes and wild beaches
      - Scenic overlooks with natural vistas
      - Botanical gardens with natural landscapes
      - Wildlife sanctuaries and nature preserves
      
      ❌ ABSOLUTELY FORBIDDEN - NEVER SUGGEST:
      - Museums, art galleries, or cultural centers (even outdoor ones)
      - Theme parks, amusement parks, or entertainment venues
      - Sports facilities, stadiums, or recreational complexes
      - Shopping areas, markets, or commercial districts
      - Urban parks with primarily artificial features
      - Public pools, water parks, or artificial beaches
      - Zoos (even outdoor ones) - only wildlife sanctuaries
      - Historical monuments or architectural sites
      - Restaurants, cafes, or food-focused destinations
      - Churches, temples, or religious buildings
      - City centers, downtown areas, or urban attractions
      - Artificial lakes or man-made water features
      - Playgrounds or primarily developed recreational areas
      
      ${baseCriteria}
      
      Focus on finding diverse, high-quality NATURAL destinations around ${locationName} that offer authentic outdoor and nature experiences. 
      Mix different types of natural landscapes (mountains, forests, lakes, etc.) to provide variety.
      Prioritize places where people can directly experience and interact with natural environments.
      
      NATURE EXPERIENCE FOCUS: Every suggestion must provide direct contact with natural elements - trees, water, rocks, wildlife, natural terrain, fresh air, and natural beauty.
      
      LOCATION CONTEXT: The user is starting from ${locationName}, so suggest natural destinations that make sense geographically from this location.
      
      ${
        currentContext.previousPlaces.length > 0
          ? `
      🚨 CRITICAL: This is batch ${batchNumber}. You MUST avoid suggesting places that are:
      - Within 10km of any previously suggested location
      - Similar in type, characteristics, or experience to previous recommendations
      - Variations or alternate routes of places already suggested
      
      MANDATORY DIVERSITY: Each new recommendation must be genuinely different and offer a completely unique experience.`
          : ''
      }
      
      RANKING CRITERIA:
      Rate each destination 1-3 stars based on how well it fulfills the user's specific request:
      - 3 stars: Perfect match for user's request, must-go destination that exactly meets their criteria
      - 2 stars: Very good match, strongly aligns with user's preferences 
      - 1 star: Good option that meets basic criteria but may be less ideal for this specific request
      
      Consider the user's activity preferences, timing, distance, transport method, and especially their additional search info when rating.
      
      🚨 FINAL NATURE-ONLY VERIFICATION:
      Before generating your response, double-check that EVERY suggestion is:
      ✅ A natural outdoor environment (forests, mountains, lakes, beaches, rivers, etc.)
      ✅ Provides direct contact with nature elements (trees, water, rocks, wildlife, natural terrain)
      ✅ Offers outdoor activities in natural settings
      ❌ NOT artificial, commercial, urban, or primarily man-made
      ❌ NOT museums, pools, zoos, theme parks, or indoor attractions
      
      If any suggestion doesn't meet these nature criteria, REPLACE it with a different natural place.
      
      Return exactly 4 NATURAL destinations.
      ${responseFormat}
    `

    const batchData = await executeDiscoverPrompt(prompt, modelName)

    if (Array.isArray(batchData)) {
      // Add a generated ID to each result if not present
      const batchResults = batchData.map((place, index) => ({
        ...place,
        id: place.id || `batch-${batchNumber}-${index}`,
        starRating: place.starRating || 2, // Default star rating
        transportMode: place.transportMode || transportType || 'car', // Use user's selected transport type as fallback
      }))

      // Enrich places with Google Photos and Reviews in parallel
      const enrichedResults = await Promise.all(
        batchResults.map(async (place) => {
          try {
            const googleData = await enrichPlaceWithGoogleData(
              place.name,
              place.lat,
              place.long
            )

            return {
              ...place,
              photos: googleData.photos,
              reviews: googleData.reviews,
              googleRating: googleData.googleRating,
              reviewCount: googleData.reviewCount,
              googleMapsUri: googleData.googleMapsUri,
              displayName: googleData.displayName,
              placeId: googleData.placeId,
              // Only update these fields if they're not already set by AI or if Google has better info
              operatingHours: googleData.operatingHours || place.operatingHours,
              parkingInfo: googleData.parkingInfo || place.parkingInfo,
              // Add new fields from Google Places
              entranceFee: googleData.priceLevel || place.entranceFee,
              accessibilityInfo: googleData.accessibilityInfo,
            }
          } catch (error) {
            console.error(
              `Failed to enrich place ${place.name} with Google data:`,
              error
            )
            return place // Return original place if enrichment fails
          }
        })
      )

      // Build updated search context for next iteration
      const allPlaces = [
        ...currentContext.previousPlaces,
        ...convertToMinimalContext(enrichedResults),
      ]
      const updatedPreferences = extractUserPreferences(allPlaces)

      const updatedSearchContext: OptimizedSearchContext = {
        previousPlaces: allPlaces,
        userPreferences: updatedPreferences,
        batchNumber: batchNumber + 1,
      }

      return {
        success: true,
        data: enrichedResults,
        searchContext: updatedSearchContext,
        batchNumber: batchNumber,
        hasMore: true, // Always assume there could be more results
        locationName, // Include location name in response
      }
    } else {
      return {
        success: false,
        data: [],
        searchContext: searchContext || undefined,
        batchNumber: batchNumber,
        hasMore: false,
        error: createDiscoverError(
          DiscoverErrorType.AI_PARSING_ERROR,
          'Invalid response format from AI',
          undefined,
          true,
          'AI response was not in the expected format. Please try again.'
        ),
      }
    }
  } catch (apiError) {
    console.error(`Batch ${batchNumber} AI search error:`, apiError)

    // If it's already a DiscoverError, return it properly
    if (
      typeof apiError === 'object' &&
      apiError !== null &&
      'type' in apiError
    ) {
      return {
        success: false,
        error: apiError as DiscoverError,
        batchNumber: batchNumber,
        hasMore: false,
        searchContext: searchContext || undefined,
      }
    }

    // Handle other errors
    let errorMessage = `Failed to get place suggestions from AI.`
    if (apiError instanceof Error && apiError.message) {
      errorMessage += ` Details: ${apiError.message}`
    }

    return {
      success: false,
      error: createDiscoverError(
        DiscoverErrorType.AI_SERVICE_ERROR,
        errorMessage,
        apiError,
        true,
        'Failed to get place suggestions. Please try again later.'
      ),
      batchNumber: batchNumber,
      hasMore: false,
      searchContext: searchContext || undefined,
    }
  }
}

// Server action to handle user feedback on places
export async function updatePlaceFeedback(
  placeId: string,
  feedback: 'liked' | 'disliked' | null
) {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return { error: authResult.error }
  }

  try {
    // For now, we'll just return success since we're handling feedback in-memory
    // In the future, this could save to a database
    return {
      success: true,
      placeId,
      feedback,
    }
  } catch (error) {
    console.error('Error updating place feedback:', error)
    return {
      error: 'Failed to update place feedback',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
