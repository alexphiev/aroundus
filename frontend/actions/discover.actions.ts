"use server";

import { createClient } from "@/utils/supabase/server";
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import * as z from "zod";

// Re-define or import the schema if it's complex and shared
const formSchema = z.object({
  activity: z.string().min(1),
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
});

type FormSchemaWithLocation = z.infer<typeof formSchema>;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI trip search will not function.");
}
const genAI = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

// Configuration for safety settings (adjust as needed)
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

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
    config: { safetySettings: safetySettings },
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

  const modelName = "gemma-3-27b-it";
  console.log(`Using AI model: ${modelName} for progressive search`);

  // Base criteria for all prompts
  const baseCriteria = `
    STRICT REQUIREMENTS:
    - Preferred activity type: ${validatedData.activity}
    - Maximum travel time to location: ${validatedData.distance} (ONE WAY)
    - Desired activity duration at location: ${validatedData.activityDurationValue} ${validatedData.activityDurationUnit}
    - Physical activity level: ${validatedData.activityLevel} (where 1 is very light and 5 is very strenuous)
    - Starting GPS location: latitude ${validatedData.location.latitude}, longitude ${validatedData.location.longitude}
    
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

  // Base criteria for all prompts
  const baseCriteria = `
    STRICT REQUIREMENTS:
    - Preferred activity type: ${validatedData.activity}
    - Maximum travel time to location: ${validatedData.distance} (ONE WAY)
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
