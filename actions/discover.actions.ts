"use server";

import { MODEL } from "@/constants/ai.constants";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenAI, GoogleSearch, Tool } from "@google/genai";
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
    const targetDateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Find forecast items for the target date (within 5 days)
    const targetDateItems = forecast.list.filter((item) => {
      const itemDate = new Date(item.dt * 1000);
      const itemDateStr = itemDate.toISOString().split("T")[0];
      return itemDateStr === targetDateStr;
    });

    if (targetDateItems.length === 0) {
      // If no exact match, get the closest available forecast
      const closestItem = forecast.list.find((item) => {
        const itemDate = new Date(item.dt * 1000);
        return itemDate >= targetDate;
      });

      if (closestItem) {
        return `Weather forecast for ${
          new Date(closestItem.dt * 1000).toDateString()
        }: ${closestItem.weather[0].description}, temperature ${
          Math.round(closestItem.main.temp)
        }°C (feels like ${
          Math.round(closestItem.main.feels_like)
        }°C), humidity ${closestItem.main.humidity}%, wind ${
          Math.round(closestItem.wind.speed)
        } m/s, precipitation chance ${Math.round(closestItem.pop * 100)}%`;
      }

      return "Weather forecast not available for target date";
    }

    // Get morning, afternoon, and evening forecasts for the target date
    const timeSlots = targetDateItems.map((item) => {
      const time = new Date(item.dt * 1000);
      const hour = time.getHours();
      let timeOfDay = "";
      if (hour >= 6 && hour < 12) timeOfDay = "morning";
      else if (hour >= 12 && hour < 18) timeOfDay = "afternoon";
      else if (hour >= 18 && hour < 22) timeOfDay = "evening";
      else timeOfDay = "night";

      return {
        timeOfDay,
        time: time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        description: item.weather[0].description,
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        humidity: item.main.humidity,
        windSpeed: Math.round(item.wind.speed),
        precipChance: Math.round(item.pop * 100),
      };
    });

    const weatherSummary =
      `Weather forecast for ${targetDate.toDateString()}:\n` +
      timeSlots.map((slot) =>
        `- ${slot.timeOfDay} (${slot.time}): ${slot.description}, ${slot.temp}°C (feels like ${slot.feelsLike}°C), ${slot.precipChance}% chance of precipitation, wind ${slot.windSpeed} m/s, humidity ${slot.humidity}%`
      ).join("\n");

    return weatherSummary;
  } catch (error) {
    console.error("Error fetching weather data:", error);
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
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  console.log("Full result structure:", JSON.stringify(result, null, 2));

  // Check if result has candidates and extract text from first candidate
  let responseText: string = "";

  if (result.candidates && result.candidates.length > 0) {
    const candidate = result.candidates[0];
    if (
      candidate.content && candidate.content.parts &&
      candidate.content.parts.length > 0
    ) {
      responseText = candidate.content.parts[0].text || "";
    }
  }

  // Fallback methods for different response structures
  if (!responseText && result.text) {
    responseText = result.text;
  }

  // Additional fallback - try to get text from response property if available
  if (!responseText && (result as any).response) {
    const response = (result as any).response;
    if (response.text && typeof response.text === "function") {
      responseText = response.text();
    } else if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (
        candidate.content && candidate.content.parts &&
        candidate.content.parts.length > 0
      ) {
        responseText = candidate.content.parts[0].text || "";
      }
    }
  }

  if (!responseText) {
    console.error(
      "Full result structure for debugging:",
      JSON.stringify(result, null, 2),
    );
    throw new Error(
      "AI response missing text content - check console for full structure",
    );
  }

  console.log("Extracted text:", responseText);

  // Clean and parse JSON response - robust extraction with fallback
  let cleanedJsonText = responseText.trim();
  let parsedResponse;

  // Try multiple extraction methods
  try {
    // Method 1: Look for JSON block markers
    const jsonStartMarkers = ["```json\n", "```json", "```\n", "```"];
    const jsonEndMarker = "```";

    let jsonStart = -1;
    for (const marker of jsonStartMarkers) {
      const index = cleanedJsonText.indexOf(marker);
      if (index !== -1) {
        jsonStart = index + marker.length;
        break;
      }
    }

    if (jsonStart !== -1) {
      const jsonEnd = cleanedJsonText.indexOf(jsonEndMarker, jsonStart);
      if (jsonEnd !== -1) {
        cleanedJsonText = cleanedJsonText.substring(jsonStart, jsonEnd);
      } else {
        cleanedJsonText = cleanedJsonText.substring(jsonStart);
      }
    } else {
      // Method 2: Find JSON array/object directly
      const arrayStart = cleanedJsonText.indexOf("[");
      const objectStart = cleanedJsonText.indexOf("{");

      if (
        arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)
      ) {
        cleanedJsonText = cleanedJsonText.substring(arrayStart);
        let bracketCount = 0;
        let endIndex = -1;
        for (let i = 0; i < cleanedJsonText.length; i++) {
          if (cleanedJsonText[i] === "[") bracketCount++;
          if (cleanedJsonText[i] === "]") bracketCount--;
          if (bracketCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
        if (endIndex !== -1) {
          cleanedJsonText = cleanedJsonText.substring(0, endIndex);
        }
      } else if (objectStart !== -1) {
        cleanedJsonText = cleanedJsonText.substring(objectStart);
        let braceCount = 0;
        let endIndex = -1;
        for (let i = 0; i < cleanedJsonText.length; i++) {
          if (cleanedJsonText[i] === "{") braceCount++;
          if (cleanedJsonText[i] === "}") braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
        if (endIndex !== -1) {
          cleanedJsonText = cleanedJsonText.substring(0, endIndex);
        }
      }
    }

    cleanedJsonText = cleanedJsonText.trim();

    // Try to parse the extracted content
    if (
      cleanedJsonText &&
      (cleanedJsonText.startsWith("[") || cleanedJsonText.startsWith("{"))
    ) {
      parsedResponse = JSON.parse(cleanedJsonText);
    } else {
      throw new Error("No valid JSON found, attempting fallback");
    }
  } catch (error) {
    // Fallback: Make a new request specifically asking for JSON format
    console.log(
      "JSON extraction failed, attempting fallback request for JSON format",
    );

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
        "whyRecommended": "reason",
        "starRating": star_number,
        "bestTimeToVisit": "timing_info",
        "timeToAvoid": "timing_to_avoid"
      }
    ]
    
    Convert the destinations you mentioned in your previous response to this exact JSON format.
    `;

    try {
      const fallbackResult = await genAI!.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: fallbackPrompt }] }],
      });
      let fallbackText = "";

      if (fallbackResult.candidates && fallbackResult.candidates.length > 0) {
        const candidate = fallbackResult.candidates[0];
        if (
          candidate.content && candidate.content.parts &&
          candidate.content.parts.length > 0
        ) {
          fallbackText = candidate.content.parts[0].text || "";
        }
      }

      // Additional fallback handling for different response structures
      if (!fallbackText && (fallbackResult as any).response) {
        const response = (fallbackResult as any).response;
        if (response.text && typeof response.text === "function") {
          fallbackText = response.text();
        } else if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];
          if (
            candidate.content && candidate.content.parts &&
            candidate.content.parts.length > 0
          ) {
            fallbackText = candidate.content.parts[0].text || "";
          }
        }
      }

      fallbackText = fallbackText.trim();

      // Try to extract JSON from fallback response
      let fallbackJson = fallbackText;
      if (fallbackJson.startsWith("```json")) {
        fallbackJson = fallbackJson.replace(/^```json\s*/, "").replace(
          /\s*```$/,
          "",
        );
      } else if (fallbackJson.startsWith("```")) {
        fallbackJson = fallbackJson.replace(/^```\s*/, "").replace(
          /\s*```$/,
          "",
        );
      }

      const arrayStart = fallbackJson.indexOf("[");
      if (arrayStart !== -1) {
        fallbackJson = fallbackJson.substring(arrayStart);
        let bracketCount = 0;
        let endIndex = -1;
        for (let i = 0; i < fallbackJson.length; i++) {
          if (fallbackJson[i] === "[") bracketCount++;
          if (fallbackJson[i] === "]") bracketCount--;
          if (bracketCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
        if (endIndex !== -1) {
          fallbackJson = fallbackJson.substring(0, endIndex);
        }
      }

      parsedResponse = JSON.parse(fallbackJson.trim());
      console.log("Successfully parsed fallback JSON response");
    } catch (fallbackError) {
      console.error("Fallback JSON extraction also failed:", fallbackError);
      throw new Error(
        "Unable to extract valid JSON from AI response after multiple attempts",
      );
    }
  }

  // Update conversation history with both user prompt and AI response
  const updatedHistory = [
    ...conversationHistory,
    { role: "user", parts: [{ text: prompt }] }, // User message
    { role: "model", parts: [{ text: responseText }] }, // AI response
  ];

  return { response: parsedResponse, updatedHistory };
}

// Server action for batch search that gets 4 results at a time
export async function handleTripSearchBatch(
  data: FormSchemaWithLocation,
  batchNumber: number = 1,
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

  const modelName = MODEL.GEMINI_FLASH;

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
    targetDate,
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

  // Create conversation context from previous batches to avoid duplicates
  const avoidanceCriteria = conversationHistory.length > 0 
    ? `
    IMPORTANT DUPLICATION AVOIDANCE:
    Based on our conversation history, please avoid suggesting any places that are:
    - Too similar to previously mentioned destinations
    - Located too close to previously suggested locations (at least 10km apart)
    - Of the same exact type/category as previous suggestions
    
    Focus on providing DIVERSE and DIFFERENT types of nature experiences from what we've already discussed.
    `
    : "";

  // Base criteria for all prompts  
  const baseCriteria = `
    STRICT REQUIREMENTS:
    - Preferred activity type: ${validatedData.activity}
    - Visit date: ${targetDate.toDateString()} (${
    targetDate.toLocaleDateString("en-US", { weekday: "long" })
  })
    - Maximum travel time to location: ${validatedData.distance} (ONE WAY)
    - Preferred transport method: ${
    getTransportDescription(validatedData.transportType)
  }
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
    - Consider destinations that are accessible via ${
    getTransportDescription(validatedData.transportType)
  }
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
    
    For travel distance of ${validatedData.distance} via ${
    getTransportDescription(validatedData.transportType)
  }:
    - ONLY suggest places that are realistically reachable within ${validatedData.distance} travel time from the GPS coordinates (${validatedData.location.latitude}, ${validatedData.location.longitude}) using ${getTransportDescription(validatedData.transportType)}
    - Use Google Search to verify actual travel times from the starting location to ensure destinations are within the specified time limit
    - Consider realistic routes, traffic patterns, and connections for the chosen transport method
    - Factor in any transport-specific limitations (bike paths, transit schedules, parking requirements)
    
    ACTIVITY FOCUS: Prioritize locations and experiences that align with "${validatedData.activity}" activities.
    
    ${
    validatedData.additionalInfo
      ? `
    🔥 CRITICAL USER REQUEST - HIGHEST PRIORITY:
    The user specifically searched for: "${validatedData.additionalInfo}"
    
    This is the user's direct input and represents their PRIMARY desire for this trip. 
    You MUST prioritize this request above all other criteria. Every suggestion should strongly align with this user input.
    Use this as the main filter and inspiration for your recommendations.
    `
      : ""
  }
    
    ${avoidanceCriteria}
    
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
    - lat: The precise latitude of the starting point of the activity (use Google Search to find exact coordinates with full precision, e.g., 40.594721)
    - long: The precise longitude of the starting point of the activity (use Google Search to find exact coordinates with full precision, e.g., -4.156937)
    - landscape: Must be ONE of: "mountain", "forest", "lake", "beach", "river", "park", "wetland", "desert"
    - activity: Must be ONE of: "hiking", "biking", "camping", "photography", "wildlife", "walking", "swimming"
    - estimatedActivityDuration: The estimated time for the activity (e.g., "3 hours", "1 day")
    - estimatedTransportTime: The estimated one-way travel time from starting location (e.g., "45 minutes", "2 hours")
    - whyRecommended: Brief explanation of why this fits the criteria
    - starRating: Rate from 1-3 stars based on how well this destination fulfills the user's specific request (3 = perfect match and must-go, 2 = very good match, 1 = good option but less ideal)
    - bestTimeToVisit: Recommended time range for optimal experience based on weather and crowds (e.g., "8:00 AM - 11:00 AM", "early morning", "afternoon after 2 PM")
    - timeToAvoid: Times or conditions to avoid (e.g., "midday during rain", "weekends 10 AM-4 PM", "avoid if temperature below 5°C")
    
    CRITICAL: For coordinates, use Google Search to find the exact latitude and longitude of each location. 
    Provide coordinates with full precision (6 decimal places minimum) - do not round or truncate them.
    
    CRITICAL: Return ONLY a valid JSON array with NO additional text, explanations, introductions, or markdown formatting.
    Start your response immediately with [ and end with ].
    Format: [{"name": "...", "description": "...", ...}]
  `;

  try {
    // Create a simpler prompt that requests 4 high-quality destinations
    const prompt = `
      You are an expert nature concierge. Find 4 excellent nature destinations that match the user's criteria.
      
      ${baseCriteria}
      
      Focus on finding diverse, high-quality destinations that offer great nature experiences. 
      Mix different types of locations (mountains, forests, lakes, etc.) to provide variety.
      Prioritize places that are accessible, safe, and offer the type of experience the user is looking for.
      
      RANKING CRITERIA:
      Rate each destination 1-3 stars based on how well it fulfills the user's specific request:
      - 3 stars: Perfect match for user's request, must-go destination that exactly meets their criteria
      - 2 stars: Very good match, strongly aligns with user's preferences 
      - 1 star: Good option that meets basic criteria but may be less ideal for this specific request
      
      Consider the user's activity preferences, timing, distance, transport method, and especially their additional search info when rating.
      
      Return exactly 4 destinations.
      ${responseFormat}
    `;

    console.log(`Searching for batch ${batchNumber} destinations...`);
    const { response: batchData, updatedHistory } =
      await executeAIPromptWithConversation(
        prompt,
        modelName,
        conversationHistory,
      );

    if (Array.isArray(batchData)) {
      // Add a generated ID to each result if not present
      const batchResults = batchData.map((place, index) => ({
        ...place,
        id: place.id || `batch-${batchNumber}-${index}`,
        starRating: place.starRating || 2, // Default star rating
      }));

      return {
        data: batchResults,
        conversationHistory: updatedHistory,
        batchNumber: batchNumber,
        success: true,
        hasMore: true, // Always assume there could be more results
      };
    } else {
      return {
        data: [],
        conversationHistory: conversationHistory,
        batchNumber: batchNumber,
        success: false,
        hasMore: false,
        error: "Invalid response format from AI",
      };
    }
  } catch (apiError: any) {
    console.error(`Batch ${batchNumber} AI search error:`, apiError);
    let errorMessage = `Failed to get trip suggestions from AI.`;
    if (apiError.message) {
      errorMessage += ` Details: ${apiError.message}`;
    }
    return {
      error: errorMessage,
      batchNumber: batchNumber,
      success: false,
      hasMore: false,
      conversationHistory: conversationHistory,
    };
  }
}
