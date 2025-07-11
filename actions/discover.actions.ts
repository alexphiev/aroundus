'use server'

import { MODEL } from '@/constants/ai.constants'
import { getAIError, getGenAI } from '@/lib/ai.service'
import { authenticateUser } from '@/lib/auth.service'
import {
  discoverySubmissionSchema,
  type DiscoverySubmissionValues,
} from '@/schemas/form.schema'
import type {
  MinimalPlaceContext,
  OptimizedSearchContext,
  PlaceResultItem,
  UserPreferences,
} from '@/types/result.types'
import { getWeatherDataForAI } from './weather.actions'

// Helper function to execute a single AI prompt with conversation context
async function executeDiscoverPrompt(
  prompt: string,
  modelName: string
): Promise<PlaceResultItem[]> {
  const genAI = getGenAI()
  if (!genAI) {
    throw new Error(getAIError() || 'AI service unavailable')
  }
  // Build conversation history with the new prompt
  const contents = [{ role: 'user', parts: [{ text: prompt }] }]

  const result = await genAI.models.generateContent({
    model: modelName,
    contents: contents,
    config: {
      tools: [{ googleSearch: {} }],
    },
  })

  // Check if result has candidates and extract text from first candidate
  let responseText: string = ''

  if (result.candidates && result.candidates.length > 0) {
    const candidate = result.candidates[0]
    if (
      candidate.content &&
      candidate.content.parts &&
      candidate.content.parts.length > 0
    ) {
      responseText = candidate.content.parts[0].text || ''
    }
  }

  // Fallback methods for different response structures
  if (!responseText && result.text) {
    responseText = result.text
  }

  // Additional fallback for potential response structure issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!responseText && (result as any).response) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (result as any).response
    if (response.text && typeof response.text === 'function') {
      responseText = response.text()
    } else if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (
        candidate.content &&
        candidate.content.parts &&
        candidate.content.parts.length > 0
      ) {
        responseText = candidate.content.parts[0].text || ''
      }
    }
  }

  if (!responseText) {
    console.error(
      'Full result structure for debugging:',
      JSON.stringify(result, null, 2)
    )
    throw new Error(
      'AI response missing text content - check console for full structure'
    )
  }

  console.log('Extracted text:', responseText)

  // Clean and parse JSON response - robust extraction with fallback
  let cleanedJsonText = responseText.trim()
  let parsedResponse

  // Try multiple extraction methods
  try {
    // Method 1: Look for JSON block markers
    const jsonStartMarkers = ['```json\n', '```json', '```\n', '```']
    const jsonEndMarker = '```'

    let jsonStart = -1
    for (const marker of jsonStartMarkers) {
      const index = cleanedJsonText.indexOf(marker)
      if (index !== -1) {
        jsonStart = index + marker.length
        break
      }
    }

    if (jsonStart !== -1) {
      const jsonEnd = cleanedJsonText.indexOf(jsonEndMarker, jsonStart)
      if (jsonEnd !== -1) {
        cleanedJsonText = cleanedJsonText.substring(jsonStart, jsonEnd)
      } else {
        cleanedJsonText = cleanedJsonText.substring(jsonStart)
      }
    } else {
      // Method 2: Find JSON array/object directly
      const arrayStart = cleanedJsonText.indexOf('[')
      const objectStart = cleanedJsonText.indexOf('{')

      if (
        arrayStart !== -1 &&
        (objectStart === -1 || arrayStart < objectStart)
      ) {
        cleanedJsonText = cleanedJsonText.substring(arrayStart)
        let bracketCount = 0
        let endIndex = -1
        for (let i = 0; i < cleanedJsonText.length; i++) {
          if (cleanedJsonText[i] === '[') bracketCount++
          if (cleanedJsonText[i] === ']') bracketCount--
          if (bracketCount === 0) {
            endIndex = i + 1
            break
          }
        }
        if (endIndex !== -1) {
          cleanedJsonText = cleanedJsonText.substring(0, endIndex)
        }
      } else if (objectStart !== -1) {
        cleanedJsonText = cleanedJsonText.substring(objectStart)
        let braceCount = 0
        let endIndex = -1
        for (let i = 0; i < cleanedJsonText.length; i++) {
          if (cleanedJsonText[i] === '{') braceCount++
          if (cleanedJsonText[i] === '}') braceCount--
          if (braceCount === 0) {
            endIndex = i + 1
            break
          }
        }
        if (endIndex !== -1) {
          cleanedJsonText = cleanedJsonText.substring(0, endIndex)
        }
      }
    }

    cleanedJsonText = cleanedJsonText.trim()

    // Try to parse the extracted content
    if (
      cleanedJsonText &&
      (cleanedJsonText.startsWith('[') || cleanedJsonText.startsWith('{'))
    ) {
      parsedResponse = JSON.parse(cleanedJsonText)
    } else {
      throw new Error('No valid JSON found, attempting fallback')
    }
  } catch {
    // Fallback: Make a new request specifically asking for JSON format
    console.log(
      'JSON extraction failed, attempting fallback request for JSON format'
    )

    const fallbackPrompt = `
    The previous response contained good information but was not in the required JSON format.
    Please convert the destination information from your previous response into a strict JSON array format.
    
    Return ONLY a JSON array with NO additional text, explanations, or markdown formatting.
    Each destination should have this exact structure:
    
    [
      {
        "name": "destination name",
        "description": "detailed description",
        "lat": latitude_number,
        "long": longitude_number,
        "landscape": "landscape_type",
        "activity": "activity_type",
        "estimatedActivityDuration": "duration",
        "estimatedTransportTime": "transport_time",
        "transportMode": "transport_mode",
        "whyRecommended": "reason",
        "starRating": star_number,
        "bestTimeToVisit": "timing_info",
        "timeToAvoid": "timing_to_avoid"
      }
    ]
    
    Convert the destinations you mentioned in your previous response to this exact JSON format.
    `

    try {
      const fallbackResult = await genAI.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: fallbackPrompt }] }],
      })
      let fallbackText = ''

      if (fallbackResult.candidates && fallbackResult.candidates.length > 0) {
        const candidate = fallbackResult.candidates[0]
        if (
          candidate.content &&
          candidate.content.parts &&
          candidate.content.parts.length > 0
        ) {
          fallbackText = candidate.content.parts[0].text || ''
        }
      }

      fallbackText = fallbackText.trim()

      // Try to extract JSON from fallback response
      let fallbackJson = fallbackText
      if (fallbackJson.startsWith('```json')) {
        fallbackJson = fallbackJson
          .replace(/^```json\s*/, '')
          .replace(/\s*```$/, '')
      } else if (fallbackJson.startsWith('```')) {
        fallbackJson = fallbackJson
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
      }

      const arrayStart = fallbackJson.indexOf('[')
      if (arrayStart !== -1) {
        fallbackJson = fallbackJson.substring(arrayStart)
        let bracketCount = 0
        let endIndex = -1
        for (let i = 0; i < fallbackJson.length; i++) {
          if (fallbackJson[i] === '[') bracketCount++
          if (fallbackJson[i] === ']') bracketCount--
          if (bracketCount === 0) {
            endIndex = i + 1
            break
          }
        }
        if (endIndex !== -1) {
          fallbackJson = fallbackJson.substring(0, endIndex)
        }
      }

      parsedResponse = JSON.parse(fallbackJson.trim())
      console.log('Successfully parsed fallback JSON response')
    } catch (fallbackError) {
      console.error('Fallback JSON extraction also failed:', fallbackError)
      throw new Error(
        'Unable to extract valid JSON from AI response after multiple attempts'
      )
    }
  }

  return parsedResponse
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

  console.log({ preferenceGuidance })

  // --- 3. Explicit Instructions for Exploration & Diversity ---
  const explorationInstructions = `
    - **PROMOTE DIVERSITY:** Each recommendation must be distinctly different from all previous suggestions. Vary landscapes, activities, location or characteristics.
    - **GEOGRAPHIC SPREAD:** Suggest places in different directions and regions from previous recommendations to maximize exploration coverage.
    - **ACTIVITY VARIATION:** If previous suggestions focused on one type of activity, expand to different but compatible activities within the user's preferences.
    - **INCLUDE A WILDCARD ✨:** Include one recommendation that is intentionally different from the user's typical preferences but could be a pleasant surprise. Label it as a "Serendipity Pick."
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
) {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return { error: authResult.error }
  }

  // Validate incoming data again on the server (optional but good practice)
  const parseResult = discoverySubmissionSchema.safeParse(data)
  if (!parseResult.success) {
    console.error('Invalid data for place search:', parseResult.error.flatten())
    return {
      error: 'Invalid search criteria provided.',
      details: parseResult.error.flatten(),
    }
  }

  const validatedData = parseResult.data

  // Check AI availability
  if (!getGenAI()) {
    return { error: getAIError() || 'AI service unavailable' }
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

  const targetDate = getTargetDate(validatedData.when)

  // Use location name from the request (already geocoded on client)
  const locationName = validatedData.locationName || 'your location'

  // Get weather forecast for the target location and date
  const weatherData = await getWeatherDataForAI(
    validatedData.location.latitude,
    validatedData.location.longitude,
    targetDate
  )

  // Create special care requirements text
  const specialCareRequirements = []
  if (validatedData.specialCare === 'children') {
    specialCareRequirements.push(
      '- CHILD-FRIENDLY: Must be safe and suitable for children, with easy trails, no dangerous cliffs/drops, and engaging activities'
    )
  }
  if (validatedData.specialCare === 'lowMobility') {
    specialCareRequirements.push(
      '- ACCESSIBILITY: Must be accessible for people with limited mobility (paved paths, minimal elevation, wheelchair accessible where possible)'
    )
  }
  if (validatedData.specialCare === 'dogs') {
    specialCareRequirements.push(
      '- DOG-FRIENDLY: Must allow dogs, have leash-friendly trails, and provide water sources'
    )
  }

  // Create transport method description
  const getTransportDescription = (transportType?: string) => {
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
    - Preferred activity type: ${validatedData.activity}
    - Visit date: ${targetDate.toDateString()} (${targetDate.toLocaleDateString(
      'en-US',
      { weekday: 'long' }
    )})
    - Maximum travel time to location: ${validatedData.distance} (ONE WAY)
    - Preferred transport method: ${getTransportDescription(
      validatedData.transportType
    )}
    - Desired activity duration at location: ${validatedData.activityDurationValue} ${validatedData.activityDurationUnit}
    - Physical activity level: ${validatedData.activityLevel} (where 1 is very light and 5 is very strenuous)
    - Starting location: ${locationName} (latitude ${validatedData.location.latitude}, longitude ${validatedData.location.longitude})
    
    ${
      specialCareRequirements.length > 0
        ? `SPECIAL CARE REQUIREMENTS:
    ${specialCareRequirements.join('\n    ')}
    `
        : ''
    }
    
    TRANSPORT & ACCESSIBILITY:
    - Consider destinations that are accessible via ${getTransportDescription(
      validatedData.transportType
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
    
    CRITICAL: You must strictly adhere to the duration criteria. For activity duration of ${validatedData.activityDurationValue} ${validatedData.activityDurationUnit}:
    - If specified in hours: suggest activities that take between ${Math.max(
      1,
      validatedData.activityDurationValue - 1
    )} and ${validatedData.activityDurationValue + 1} hours
    - If specified in days: suggest activities that take between ${Math.max(
      1,
      validatedData.activityDurationValue - 1
    )} and ${validatedData.activityDurationValue + 1} days
    
    For travel distance of ${validatedData.distance} via ${getTransportDescription(
      validatedData.transportType
    )}:
    - ONLY suggest places that are realistically reachable within ${validatedData.distance} travel time from ${locationName} (coordinates: ${validatedData.location.latitude}, ${validatedData.location.longitude}) using ${getTransportDescription(
      validatedData.transportType
    )}
    - Use Google Search to verify actual travel times from the starting location to ensure destinations are within the specified time limit
    - Consider realistic routes, traffic patterns, and connections for the chosen transport method
    - Factor in any transport-specific limitations (bike paths, transit schedules, parking requirements)
    
    ACTIVITY FOCUS: Prioritize locations and experiences that align with "${validatedData.activity}" activities.
    
    ${
      validatedData.additionalInfo
        ? `
    🔥 CRITICAL USER REQUEST - HIGHEST PRIORITY:
    The user specifically searched for: "${validatedData.additionalInfo}"
    
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
    For each suggestion, provide these details:
    - name: A catchy and descriptive name for the spot/activity
    - description: A brief, engaging description (2-3 sentences) including specific activities and how to get there
    - lat: The precise latitude of the starting point of the activity (use Google Search to find exact coordinates with full precision, e.g., 40.594721)
    - long: The precise longitude of the starting point of the activity (use Google Search to find exact coordinates with full precision, e.g., -4.156937)
    - landscape: Must be ONE of: "mountain", "forest", "lake", "beach", "river", "park", "wetland", "desert"
    - activity: Must be ONE of: "hiking", "biking", "camping", "photography", "wildlife", "walking", "swimming"
    - estimatedActivityDuration: The estimated time range for the activity (e.g., "1-4 hours", "2-3 days")
    - estimatedTransportTime: The estimated one-way travel time from starting location (e.g., "45 minutes", "2 hours")
    - transportMode: The primary transport mode used (must be one of: "foot", "bike", "transit", "car")
    - whyRecommended: Brief explanation of why this fits the criteria
    - starRating: Rate from 1-3 stars based on how well this destination fulfills the user's specific request (3 = perfect match and must-go, 2 = very good match, 1 = good option but less ideal)
    - bestTimeToVisit: Recommended time range for optimal experience based on the weather forecast and crowds (e.g., "8:00 AM - 11:00 AM before rain starts", "early morning when clear skies", "afternoon after 2 PM when temperatures cool")
    - timeToAvoid: Times or conditions to avoid (e.g., "midday during rain", "weekends 10 AM-4 PM", "avoid if temperature below 5°C")
    
    CRITICAL: For coordinates, use Google Search to find the exact latitude and longitude of each location. 
    Provide coordinates with full precision (6 decimal places minimum) - do not round or truncate them.
    
    CRITICAL: Return ONLY a valid JSON array with NO additional text, explanations, introductions, or markdown formatting.
    Start your response immediately with [ and end with ].
    Format: [{"name": "...", "description": "...", "transportMode": "...", ...}]
  `

  try {
    // Create a simpler prompt that requests 4 high-quality destinations
    const prompt = `
      You are an expert nature concierge. Find 4 excellent nature destinations near ${locationName} that match the user's criteria.
      
      ${baseCriteria}
      
      Focus on finding diverse, high-quality destinations around ${locationName} that offer great nature experiences. 
      Mix different types of locations (mountains, forests, lakes, etc.) to provide variety.
      Prioritize places that are accessible, safe, and offer the type of experience the user is looking for.
      
      LOCATION CONTEXT: The user is starting from ${locationName}, so suggest destinations that make sense geographically from this location.
      
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
      
      Return exactly 4 destinations.
      ${responseFormat}
    `

    console.log(`Searching for batch ${batchNumber} destinations...`)
    const batchData = await executeDiscoverPrompt(prompt, modelName)

    if (Array.isArray(batchData)) {
      // Add a generated ID to each result if not present
      const batchResults = batchData.map((place, index) => ({
        ...place,
        id: place.id || `batch-${batchNumber}-${index}`,
        starRating: place.starRating || 2, // Default star rating
        transportMode:
          place.transportMode || validatedData.transportType || 'car', // Use user's selected transport type as fallback
      }))

      // Build updated search context for next iteration
      const allPlaces = [
        ...currentContext.previousPlaces,
        ...convertToMinimalContext(batchResults),
      ]
      const updatedPreferences = extractUserPreferences(allPlaces)

      const updatedSearchContext: OptimizedSearchContext = {
        previousPlaces: allPlaces,
        userPreferences: updatedPreferences,
        batchNumber: batchNumber + 1,
      }

      return {
        data: batchResults,
        searchContext: updatedSearchContext,
        batchNumber: batchNumber,
        success: true,
        hasMore: true, // Always assume there could be more results
        locationName, // Include location name in response
      }
    } else {
      return {
        data: [],
        searchContext: searchContext,
        batchNumber: batchNumber,
        success: false,
        hasMore: false,
        error: 'Invalid response format from AI',
      }
    }
  } catch (apiError) {
    console.error(`Batch ${batchNumber} AI search error:`, apiError)
    let errorMessage = `Failed to get place suggestions from AI.`
    if (apiError instanceof Error && apiError.message) {
      errorMessage += ` Details: ${apiError.message}`
    }
    return {
      error: errorMessage,
      batchNumber: batchNumber,
      success: false,
      hasMore: false,
      searchContext: searchContext,
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
