"use server";

import { MODEL } from "@/constants/ai.constants";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenAI } from "@google/genai";
import * as z from "zod";
import { getFiveDayForecast } from "./weather.actions";

// Re-define or import the schema if it's complex and shared
const formSchema = z.object({
  activity: z.string().min(1),
  when: z.string().min(1),
  distance: z.string().min(1),
  activityLevel: z.number().min(1).max(5),
  activityDurationValue: z.coerce.number(),
  activityDurationUnit: z.enum(["hours", "days"]),
  // Add location schema part
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  specialCare: z.enum(["children", "lowMobility", "dogs"]).optional(),
  additionalInfo: z.string().optional(),
  transportType: z.enum(["foot", "bike", "transit", "car"]).optional(),
});

type FormSchemaWithLocation = z.infer<typeof formSchema>;

// Helper function to get weather data for AI prompts
async function getWeatherDataForAI(lat: number, lon: number, targetDate: Date) {
  try {
    const weatherResult = await getFiveDayForecast(lat, lon);
    
    if (weatherResult.error || !weatherResult.data) {
      return "Weather data unavailable";
    }

    const forecast = weatherResult.data;
    const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Find forecast items for the target date (within 5 days)
    const targetDateItems = forecast.list.filter(item => {
      const itemDate = new Date(item.dt * 1000);
      const itemDateStr = itemDate.toISOString().split('T')[0];
      return itemDateStr === targetDateStr;
    });

    if (targetDateItems.length === 0) {
      // If no exact match, get the closest available forecast
      const closestItem = forecast.list.find(item => {
        const itemDate = new Date(item.dt * 1000);
        return itemDate >= targetDate;
      });
      
      if (closestItem) {
        return `Weather forecast for ${new Date(closestItem.dt * 1000).toDateString()}: ${closestItem.weather[0].description}, temperature ${Math.round(closestItem.main.temp)}°C (feels like ${Math.round(closestItem.main.feels_like)}°C), humidity ${closestItem.main.humidity}%, wind ${Math.round(closestItem.wind.speed)} m/s, precipitation chance ${Math.round(closestItem.pop * 100)}%`;
      }
      
      return "Weather forecast not available for target date";
    }

    // Get morning, afternoon, and evening forecasts for the target date
    const timeSlots = targetDateItems.map(item => {
      const time = new Date(item.dt * 1000);
      const hour = time.getHours();
      let timeOfDay = '';
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      return {
        timeOfDay,
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        description: item.weather[0].description,
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        humidity: item.main.humidity,
        windSpeed: Math.round(item.wind.speed),
        precipChance: Math.round(item.pop * 100)
      };
    });

    const weatherSummary = `Weather forecast for ${targetDate.toDateString()}:\n` +
      timeSlots.map(slot => 
        `- ${slot.timeOfDay} (${slot.time}): ${slot.description}, ${slot.temp}°C (feels like ${slot.feelsLike}°C), ${slot.precipChance}% chance of precipitation, wind ${slot.windSpeed} m/s, humidity ${slot.humidity}%`
      ).join('\n');

    return weatherSummary;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return "Weather data unavailable due to error";
  }
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI trip search will not function.");
}
const genAI = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

// Helper function to execute a single AI prompt with conversation context
async function executeAIPromptWithConversation(
  prompt: string,
  modelName: string,
  conversationHistory: any[] = [],
): Promise<{ response: any; updatedHistory: any[] }> {
  // Build conversation history with the new prompt
  const contents = [
    ...conversationHistory,
    { role: "user", parts: [{ text: prompt }] },
  ];

  const result = await genAI!.models.generateContent({
    model: modelName,
    contents: contents,
  });

  if (!result || typeof result.text !== "string") {
    throw new Error("AI response missing or has unexpected format");
  }

  // Clean and parse JSON response
  let cleanedJsonText = result.text.trim();
  if (cleanedJsonText.startsWith("```json")) {
    cleanedJsonText = cleanedJsonText.substring(7);
    if (cleanedJsonText.endsWith("```")) {
      cleanedJsonText = cleanedJsonText.substring(
        0,
        cleanedJsonText.length - 3,
      );
    }
  }
  cleanedJsonText = cleanedJsonText.trim();

  const parsedResponse = JSON.parse(cleanedJsonText);

  // Update conversation history with both user prompt and AI response
  const updatedHistory = [
    ...conversationHistory,
    { role: "user", parts: [{ text: prompt }] }, // User message
    { role: "model", parts: [{ text: result.text }] }, // AI response
  ];

  return { response: parsedResponse, updatedHistory };
}

// Progressive search function that yields results as they come in (for server-side use)
async function* progressiveTripSearchGenerator(
  data: FormSchemaWithLocation,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated for trip search:", userError);
    yield { error: "User not authenticated. Please sign in again." };
    return;
  }

  // Validate incoming data again on the server (optional but good practice)
  const parseResult = formSchema.safeParse(data);
  if (!parseResult.success) {
    console.error("Invalid data for trip search:", parseResult.error.flatten());
    yield {
      error: "Invalid search criteria provided.",
      details: parseResult.error.flatten(),
    };
    return;
  }

  const validatedData = parseResult.data;

  console.log("Authenticated user:", user.id);
  console.log("Received validated search criteria:", validatedData);

  if (!genAI) {
    yield { error: "AI service is not configured. Missing API key." };
    return;
  }

  const modelName = MODEL.GEMINI_PRO;
  console.log(`Using AI model: ${modelName} for progressive search`);

  // Parse when field to get target date
  const getTargetDate = (when: string) => {
    const now = new Date();
    switch (when) {
      case "today":
        return now;
      case "tomorrow":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case "this_weekend":
        const daysUntilSaturday = 6 - now.getDay();
        return new Date(
          now.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000,
        );
      default:
        try {
          return new Date(when);
        } catch {
          return now;
        }
    }
  };

  const targetDate = getTargetDate(validatedData.when);

  // Get weather forecast for the target location and date
  const weatherData = await getWeatherDataForAI(
    validatedData.location.latitude,
    validatedData.location.longitude,
    targetDate
  );

  // Base criteria for all prompts
  const baseCriteria = `
    STRICT REQUIREMENTS:
    - Preferred activity type: ${validatedData.activity}
    - Visit date: ${targetDate.toDateString()} (${
    targetDate.toLocaleDateString("en-US", { weekday: "long" })
  })
    - Maximum travel time to location: ${validatedData.distance} (ONE WAY)
    - Desired activity duration at location: ${validatedData.activityDurationValue} ${validatedData.activityDurationUnit}
    - Physical activity level: ${validatedData.activityLevel} (where 1 is very light and 5 is very strenuous)
    - Starting GPS location: latitude ${validatedData.location.latitude}, longitude ${validatedData.location.longitude}
    
    REAL-TIME WEATHER DATA:
    ${weatherData}
    
    TIMING CONSIDERATIONS:
    - Use the real-time weather forecast above to make specific timing recommendations
    - Account for weekend vs weekday crowd levels and suggest timing accordingly
    - Consider any potential public holidays or local events that might affect crowds
    - Factor in weather conditions and recommend the best times to visit based on forecast
    - Suggest alternative timing if weather conditions are poor
    
    CRITICAL: You must strictly adhere to the duration criteria. For activity duration of ${validatedData.activityDurationValue} ${validatedData.activityDurationUnit}:
    - If specified in hours: suggest activities that take between ${
    Math.max(1, validatedData.activityDurationValue - 1)
  } and ${validatedData.activityDurationValue + 1} hours
    - If specified in days: suggest activities that take between ${
    Math.max(1, validatedData.activityDurationValue - 1)
  } and ${validatedData.activityDurationValue + 1} days
    
    For travel distance of ${validatedData.distance}:
    - Only suggest places that are within this travel time from the starting location
    - Consider realistic travel methods (car, public transport, walking/biking for short distances)
    
    ACTIVITY FOCUS: Prioritize locations and experiences that align with "${validatedData.activity}" activities.
    
    ${validatedData.additionalInfo ? `
    🔥 CRITICAL USER REQUEST - HIGHEST PRIORITY:
    The user specifically searched for: "${validatedData.additionalInfo}"
    
    This is the user's direct input and represents their PRIMARY desire for this trip. 
    You MUST prioritize this request above all other criteria. Every suggestion should strongly align with this user input.
    Use this as the main filter and inspiration for your recommendations.
    ` : ''}
  `;

  const responseFormat = `
    For each suggestion, provide these details:
    - name: A catchy and descriptive name for the spot/activity
    - description: A brief, engaging description (2-3 sentences) including specific activities and how to get there
    - lat: The latitude of the starting point of the activity
    - long: The longitude of the starting point of the activity
    - landscape: Must be ONE of: "mountain", "forest", "lake", "beach", "river", "park", "wetland", "desert"
    - activity: Must be ONE of: "hiking", "biking", "camping", "photography", "wildlife", "walking", "swimming"
    - estimatedActivityDuration: The estimated time for the activity (e.g., "3 hours", "1 day")
    - estimatedTransportTime: The estimated one-way travel time from starting location (e.g., "45 minutes", "2 hours")
    - whyRecommended: Brief explanation of why this fits the criteria and category
    - starRating: The star rating (3, 2, or 1)
    - bestTimeToVisit: Recommended time range for optimal experience based on weather and crowds (e.g., "8:00 AM - 11:00 AM", "early morning", "afternoon after 2 PM")
    - timeToAvoid: Times or conditions to avoid (e.g., "midday during rain", "weekends 10 AM-4 PM", "avoid if temperature below 5°C")
    
    Return ONLY valid JSON array format: [{"name": "...", "description": "...", ...}]
  `;

  const allResults: any[] = [];
  let conversationHistory: any[] = [];

  try {
    // 1. THREE STARS: Must-go iconic places
    const threeStarPrompt = `
      You are an expert nature concierge like the French Routard guide. Find the most ICONIC and MUST-VISIT nature destinations.
      
      ${baseCriteria}
      
      Focus on: 
      - Famous, well-known natural landmarks and destinations
      - Places that locals and tourists consider absolute must-sees
      - Iconic viewpoints, waterfalls, beaches, mountains that are renowned
      - Places featured in travel guides and photography
      - Destinations that define the natural beauty of the region
      
      Find 2-3 THREE-STAR (★★★) destinations that are unmissable classics.
      ${responseFormat}
    `;

    console.log("Searching for 3-star destinations...");
    const { response: threeStarData, updatedHistory } =
      await executeAIPromptWithConversation(
        threeStarPrompt,
        modelName,
        conversationHistory,
      );
    conversationHistory = updatedHistory;

    if (Array.isArray(threeStarData)) {
      const threeStarPlaces = threeStarData.map((place) => ({
        ...place,
        starRating: 3,
      }));
      allResults.push(...threeStarPlaces);
      console.log(`Found ${threeStarPlaces.length} three-star destinations`);

      const sortedPlaces = allResults.sort((a, b) =>
        (b.starRating || 0) - (a.starRating || 0)
      );

      // Yield first batch of results
      yield { data: sortedPlaces, isComplete: false, stage: "3-star" };
    }

    // 2. TWO STARS: Very good but less popular places
    const twoStarPrompt = `
      Now find VERY GOOD nature destinations that are less crowded but still excellent. 
      
      IMPORTANT: Based on our previous conversation where I found 3-star destinations, please avoid suggesting any similar or nearby places.
      
      ${baseCriteria}
      
      Focus on:
      - Beautiful natural places that are known to locals but not tourist hotspots
      - Places with rich biodiversity and natural beauty
      - Scenic spots that offer great experiences without the crowds
      - Regional parks, lesser-known trails, quiet beaches
      - Places that nature enthusiasts appreciate but aren't mainstream famous
      
      AVOID:
      - Any places you already suggested in the 3-star recommendations
      - Places that are very famous or iconic (those are 3-star)
      - Locations too close to the 3-star destinations you already mentioned
      
      Find 2-3 TWO-STAR (★★) destinations that offer excellent nature experiences and are DIFFERENT from your previous suggestions.
      ${responseFormat}
    `;

    console.log("Searching for 2-star destinations...");
    const { response: twoStarData, updatedHistory: updatedHistory2 } =
      await executeAIPromptWithConversation(
        twoStarPrompt,
        modelName,
        conversationHistory,
      );
    conversationHistory = updatedHistory2;
    if (Array.isArray(twoStarData)) {
      const twoStarPlaces = twoStarData.map((place) => ({
        ...place,
        starRating: 2,
      }));

      // Filter out duplicates before adding to results
      const filteredTwoStarPlaces = twoStarPlaces.filter((newPlace) => {
        return !allResults.some((existing) => {
          const latDiff = Math.abs(existing.lat - newPlace.lat);
          const longDiff = Math.abs(existing.long - newPlace.long);
          const isLocationSimilar = latDiff < 0.01 && longDiff < 0.01;

          const extractMainName = (name: string) => {
            return name
              .toLowerCase()
              .replace(
                /\b(trail|walk|hike|photography|picnic|camping|swimming|biking|vista|viewpoint|lookout)\b/g,
                "",
              )
              .replace(/\s+/g, " ")
              .trim();
          };

          const existingMainName = extractMainName(existing.name);
          const newMainName = extractMainName(newPlace.name);
          const isNameSimilar = existingMainName === newMainName ||
            existingMainName.includes(newMainName) ||
            newMainName.includes(existingMainName);

          return isLocationSimilar || isNameSimilar;
        });
      });

      allResults.push(...filteredTwoStarPlaces);
      console.log(
        `Found ${filteredTwoStarPlaces.length} new two-star destinations (${
          twoStarPlaces.length - filteredTwoStarPlaces.length
        } duplicates filtered)`,
      );

      // Yield second batch of results
      const sortedPlaces = allResults.sort((a, b) =>
        (b.starRating || 0) - (a.starRating || 0)
      );
      yield { data: sortedPlaces, isComplete: false, stage: "2-star" };
    }

    // 3. ONE STAR: Hidden gems and original discoveries
    const oneStarPrompt = `
      Finally, find HIDDEN GEMS and SECRET SPOTS that are truly off the beaten path.
      
      IMPORTANT: Based on our entire conversation where I found 3-star and 2-star destinations, please suggest completely different and unique places.
      
      ${baseCriteria}
      
      Focus on:
      - Hidden, unknown, or secret natural spots
      - Places that only locals or nature experts know about
      - Unique, original, or quirky natural features
      - Off-the-beaten-path discoveries
      - Small natural wonders that are worth the adventure
      - Places that feel like personal discoveries
      
      AVOID:
      - Any places you already suggested in the 3-star or 2-star recommendations
      - Famous places or even moderately known spots
      - Locations near any of the destinations you previously mentioned
      
      Find 1-2 ONE-STAR (★) hidden gems that are completely ORIGINAL and different from all your previous suggestions.
      ${responseFormat}
    `;

    console.log("Searching for 1-star hidden gems...");
    const { response: oneStarData, updatedHistory: updatedHistory3 } =
      await executeAIPromptWithConversation(
        oneStarPrompt,
        modelName,
        conversationHistory,
      );
    conversationHistory = updatedHistory3;
    if (Array.isArray(oneStarData)) {
      const oneStarPlaces = oneStarData.map((place) => ({
        ...place,
        starRating: 1,
      }));

      // Filter out duplicates before adding to results
      const filteredOneStarPlaces = oneStarPlaces.filter((newPlace) => {
        return !allResults.some((existing) => {
          const latDiff = Math.abs(existing.lat - newPlace.lat);
          const longDiff = Math.abs(existing.long - newPlace.long);
          const isLocationSimilar = latDiff < 0.01 && longDiff < 0.01;

          const extractMainName = (name: string) => {
            return name
              .toLowerCase()
              .replace(
                /\b(trail|walk|hike|photography|picnic|camping|swimming|biking|vista|viewpoint|lookout)\b/g,
                "",
              )
              .replace(/\s+/g, " ")
              .trim();
          };

          const existingMainName = extractMainName(existing.name);
          const newMainName = extractMainName(newPlace.name);
          const isNameSimilar = existingMainName === newMainName ||
            existingMainName.includes(newMainName) ||
            newMainName.includes(existingMainName);

          return isLocationSimilar || isNameSimilar;
        });
      });

      allResults.push(...filteredOneStarPlaces);
      console.log(
        `Found ${filteredOneStarPlaces.length} new one-star hidden gems (${
          oneStarPlaces.length - filteredOneStarPlaces.length
        } duplicates filtered)`,
      );
    }

    // Final results with all data (already filtered for duplicates)
    const sortedPlaces = allResults.sort((a, b) =>
      (b.starRating || 0) - (a.starRating || 0)
    );

    console.log(
      `Final results: ${sortedPlaces.length} unique places across all categories`,
    );

    yield { data: sortedPlaces, isComplete: true, stage: "complete" };
  } catch (apiError: any) {
    console.error("Progressive AI search error:", apiError);
    let errorMessage = "Failed to get trip suggestions from AI.";
    if (apiError.message) {
      errorMessage += ` Details: ${apiError.message}`;
    }
    yield { error: errorMessage };
  }
}

// Server action for progressive search that can be called from client
export async function handleProgressiveSearch(
  data: FormSchemaWithLocation,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated for trip search:", userError);
    return { error: "User not authenticated. Please sign in again." };
  }

  // Validate incoming data again on the server (optional but good practice)
  const parseResult = formSchema.safeParse(data);
  if (!parseResult.success) {
    console.error("Invalid data for trip search:", parseResult.error.flatten());
    return {
      error: "Invalid search criteria provided.",
      details: parseResult.error.flatten(),
    };
  }

  const validatedData = parseResult.data;

  console.log("Authenticated user:", user.id);
  console.log("Received validated search criteria:", validatedData);

  if (!genAI) {
    return { error: "AI service is not configured. Missing API key." };
  }

  // Return the complete search results (simplified for now)
  try {
    const results = [];
    for await (const result of progressiveTripSearchGenerator(validatedData)) {
      if (result.error) {
        return { error: result.error };
      }
      if (result.data && result.isComplete) {
        return {
          data: result.data,
          isComplete: true,
          stage: "complete",
        };
      }
    }
    return { data: [], isComplete: true, stage: "complete" };
  } catch (error: any) {
    console.error("Progressive search error:", error);
    return { error: "Failed to get trip suggestions from AI." };
  }
}

// Server action for progressive search that executes each stage separately
export async function handleProgressiveTripSearchByStage(
  data: FormSchemaWithLocation,
  stage: "3-star" | "2-star" | "1-star",
  conversationHistory: any[] = [],
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated for trip search:", userError);
    return { error: "User not authenticated. Please sign in again." };
  }

  // Validate incoming data again on the server (optional but good practice)
  const parseResult = formSchema.safeParse(data);
  if (!parseResult.success) {
    console.error("Invalid data for trip search:", parseResult.error.flatten());
    return {
      error: "Invalid search criteria provided.",
      details: parseResult.error.flatten(),
    };
  }

  const validatedData = parseResult.data;

  if (!genAI) {
    return { error: "AI service is not configured. Missing API key." };
  }

  const modelName = "gemma-3-27b-it";

  // Parse when field to get target date
  const getTargetDate = (when: string) => {
    const now = new Date();
    switch (when) {
      case "today":
        return now;
      case "tomorrow":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case "this_weekend":
        const daysUntilSaturday = 6 - now.getDay();
        return new Date(
          now.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000,
        );
      default:
        try {
          return new Date(when);
        } catch {
          return now;
        }
    }
  };

  const targetDate = getTargetDate(validatedData.when);

  // Get weather forecast for the target location and date
  const weatherData = await getWeatherDataForAI(
    validatedData.location.latitude,
    validatedData.location.longitude,
    targetDate
  );

  // Create special care requirements text
  const specialCareRequirements = [];
  if (validatedData.specialCare === "children") {
    specialCareRequirements.push(
      "- CHILD-FRIENDLY: Must be safe and suitable for children, with easy trails, no dangerous cliffs/drops, and engaging activities",
    );
  }
  if (validatedData.specialCare === "lowMobility") {
    specialCareRequirements.push(
      "- ACCESSIBILITY: Must be accessible for people with limited mobility (paved paths, minimal elevation, wheelchair accessible where possible)",
    );
  }
  if (validatedData.specialCare === "dogs") {
    specialCareRequirements.push(
      "- DOG-FRIENDLY: Must allow dogs, have leash-friendly trails, and provide water sources",
    );
  }

  // Create transport method description
  const getTransportDescription = (transportType?: string) => {
    switch (transportType) {
      case "foot":
        return "traveling on foot/walking";
      case "bike":
        return "traveling by bicycle";
      case "transit":
        return "using public transport (buses, trains, metro)";
      case "car":
        return "traveling by car";
      default:
        return "using any available transport method";
    }
  };

  // Base criteria for all prompts
  const baseCriteria = `
    STRICT REQUIREMENTS:
    - Preferred activity type: ${validatedData.activity}
    - Visit date: ${targetDate.toDateString()} (${
    targetDate.toLocaleDateString("en-US", { weekday: "long" })
  })
    - Maximum travel time to location: ${validatedData.distance} (ONE WAY)
    - Preferred transport method: ${getTransportDescription(validatedData.transportType)}
    - Desired activity duration at location: ${validatedData.activityDurationValue} ${validatedData.activityDurationUnit}
    - Physical activity level: ${validatedData.activityLevel} (where 1 is very light and 5 is very strenuous)
    - Starting GPS location: latitude ${validatedData.location.latitude}, longitude ${validatedData.location.longitude}
    
    ${
    specialCareRequirements.length > 0
      ? `SPECIAL CARE REQUIREMENTS:
    ${specialCareRequirements.join("\n    ")}
    `
      : ""
  }
    
    TRANSPORT & ACCESSIBILITY:
    - Consider destinations that are accessible via ${getTransportDescription(validatedData.transportType)}
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
    
    CRITICAL: You must strictly adhere to the duration criteria. For activity duration of ${validatedData.activityDurationValue} ${validatedData.activityDurationUnit}:
    - If specified in hours: suggest activities that take between ${
    Math.max(1, validatedData.activityDurationValue - 1)
  } and ${validatedData.activityDurationValue + 1} hours
    - If specified in days: suggest activities that take between ${
    Math.max(1, validatedData.activityDurationValue - 1)
  } and ${validatedData.activityDurationValue + 1} days
    
    For travel distance of ${validatedData.distance} via ${getTransportDescription(validatedData.transportType)}:
    - Only suggest places that are realistically reachable within this travel time using the specified transport method
    - Consider realistic routes and connections for the chosen transport method
    - Factor in any transport-specific limitations (bike paths, transit schedules, parking requirements)
    
    ACTIVITY FOCUS: Prioritize locations and experiences that align with "${validatedData.activity}" activities.
    
    ${validatedData.additionalInfo ? `
    🔥 CRITICAL USER REQUEST - HIGHEST PRIORITY:
    The user specifically searched for: "${validatedData.additionalInfo}"
    
    This is the user's direct input and represents their PRIMARY desire for this trip. 
    You MUST prioritize this request above all other criteria. Every suggestion should strongly align with this user input.
    Use this as the main filter and inspiration for your recommendations.
    ` : ''}
    
    ${
    specialCareRequirements.length > 0
      ? "IMPORTANT: All suggestions must strictly comply with the special care requirements listed above."
      : ""
  }
  `;

  const responseFormat = `
    For each suggestion, provide these details:
    - name: A catchy and descriptive name for the spot/activity
    - description: A brief, engaging description (2-3 sentences) including specific activities and how to get there
    - lat: The latitude of the starting point of the activity
    - long: The longitude of the starting point of the activity
    - landscape: Must be ONE of: "mountain", "forest", "lake", "beach", "river", "park", "wetland", "desert"
    - activity: Must be ONE of: "hiking", "biking", "camping", "photography", "wildlife", "walking", "swimming"
    - estimatedActivityDuration: The estimated time for the activity (e.g., "3 hours", "1 day")
    - estimatedTransportTime: The estimated one-way travel time from starting location (e.g., "45 minutes", "2 hours")
    - whyRecommended: Brief explanation of why this fits the criteria and category
    - starRating: The star rating (3, 2, or 1)
    - bestTimeToVisit: Recommended time range for optimal experience based on weather and crowds (e.g., "8:00 AM - 11:00 AM", "early morning", "afternoon after 2 PM")
    - timeToAvoid: Times or conditions to avoid (e.g., "midday during rain", "weekends 10 AM-4 PM", "avoid if temperature below 5°C")
    
    Return ONLY valid JSON array format: [{"name": "...", "description": "...", ...}]
  `;

  try {
    let prompt = "";
    let starRating = 1;

    if (stage === "3-star") {
      starRating = 3;
      prompt = `
        You are an expert nature concierge like the French Routard guide. Find the most ICONIC and MUST-VISIT nature destinations.
        
        ${baseCriteria}
        
        Focus on: 
        - Famous, well-known natural landmarks and destinations
        - Places that locals and tourists consider absolute must-sees
        - Iconic viewpoints, waterfalls, beaches, mountains that are renowned
        - Places featured in travel guides and photography
        - Destinations that define the natural beauty of the region
        
        Find 2-3 THREE-STAR (★★★) destinations that are unmissable classics.
        ${responseFormat}
      `;
    } else if (stage === "2-star") {
      starRating = 2;
      prompt = `
        Now find VERY GOOD nature destinations that are less crowded but still excellent.
        
        IMPORTANT: Based on our previous conversation where I found 3-star destinations, please avoid suggesting any similar or nearby places.
        
        ${baseCriteria}
        
        Focus on:
        - Beautiful natural places that are known to locals but not tourist hotspots
        - Places with rich biodiversity and natural beauty
        - Scenic spots that offer great experiences without the crowds
        - Regional parks, lesser-known trails, quiet beaches
        - Places that nature enthusiasts appreciate but aren't mainstream famous
        
        AVOID:
        - Any places you already suggested in the 3-star recommendations
        - Places that are very famous or iconic (those are 3-star)
        - Locations too close to the 3-star destinations you already mentioned
        
        Find 2-3 TWO-STAR (★★) destinations that offer excellent nature experiences and are DIFFERENT from your previous suggestions.
        ${responseFormat}
      `;
    } else if (stage === "1-star") {
      starRating = 1;
      prompt = `
        Finally, find HIDDEN GEMS and SECRET SPOTS that are truly off the beaten path.
        
        IMPORTANT: Based on our entire conversation where I found 3-star and 2-star destinations, please suggest completely different and unique places.
        
        ${baseCriteria}
        
        Focus on:
        - Hidden, unknown, or secret natural spots
        - Places that only locals or nature experts know about
        - Unique, original, or quirky natural features
        - Off-the-beaten-path discoveries
        - Small natural wonders that are worth the adventure
        - Places that feel like personal discoveries
        
        AVOID:
        - Any places you already suggested in the 3-star or 2-star recommendations
        - Famous places or even moderately known spots
        - Locations near any of the destinations you previously mentioned
        
        Find 1-2 ONE-STAR (★) hidden gems that are completely ORIGINAL and different from all your previous suggestions.
        ${responseFormat}
      `;
    }

    console.log(`Searching for ${stage} destinations...`);
    const { response: stageData, updatedHistory } =
      await executeAIPromptWithConversation(
        prompt,
        modelName,
        conversationHistory,
      );

    if (Array.isArray(stageData)) {
      const stageResults = stageData.map((place) => ({
        ...place,
        starRating: starRating,
      }));

      return {
        data: stageResults,
        conversationHistory: updatedHistory,
        stage: stage,
        success: true,
      };
    } else {
      return {
        data: [],
        conversationHistory: conversationHistory,
        stage: stage,
        success: false,
        error: "Invalid response format from AI",
      };
    }
  } catch (apiError: any) {
    console.error(`${stage} AI search error:`, apiError);
    let errorMessage = `Failed to get ${stage} trip suggestions from AI.`;
    if (apiError.message) {
      errorMessage += ` Details: ${apiError.message}`;
    }
    return {
      error: errorMessage,
      stage: stage,
      success: false,
      conversationHistory: conversationHistory,
    };
  }
}
