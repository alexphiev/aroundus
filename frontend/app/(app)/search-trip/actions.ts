"use server";

import { createClient } from "@/utils/supabase/server";
import * as z from "zod";
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";

// Re-define or import the schema if it's complex and shared
const formSchema = z.object({
  tripCompanions: z.string(),
  distanceValue: z.coerce.number(),
  distanceUnit: z.enum(["minutes", "hours"]),
  activityLevel: z.number().min(1).max(5),
  durationValue: z.coerce.number(),
  durationUnit: z.enum(["hours", "days"]),
  // Add location schema part
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
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

export async function handleTripSearch(data: FormSchemaWithLocation) {
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

  const modelName = "gemma-3-27b-it";
  console.log(`Using AI model: ${modelName}`);

  const prompt = `
    You are an expert nature trip planner.
    Plan a nature trip for: ${validatedData.tripCompanions}.
    The trip should be a maximum of ${validatedData.distanceValue} ${validatedData.distanceUnit} travel time away from starting GPS location: latitude ${validatedData.location.latitude}, longitude ${validatedData.location.longitude}.
    The desired physical activity level is ${validatedData.activityLevel} (where 1 is very light and 5 is very strenuous).
    The desired total duration of the trip is ${validatedData.durationValue} ${validatedData.durationUnit}.
    
    Please suggest 2-4 distinct nature spots or activities.
    For each suggestion, provide the following details in a JSON object:
    - name: A catchy and descriptive name for the spot/activity.
    - description: A brief, engaging description (2-3 sentences). The list of activities possible and relevant for the target audience. Then details on how to get there from the user's location.
    - lat: The latitude of the starting point of the activity.
    - long: The longitude of the starting point of the activity.
    - landscape: The primary type of landscape for this location. Must be ONE of these exact values: "mountain", "forest", "lake", "beach", "river", "park", "wetland", or "desert".
    - activity: The primary activity for this location. Must be ONE of these exact values: "hiking", "biking", "camping", "photography", "wildlife", "walking", or "swimming".

    Return your answer as a single, valid JSON array containing these objects. Do not include any explanatory text or markdown formatting outside of this JSON array.
    Example of one item in the JSON array:
    { 
      "name": "Hidden Waterfall Hike",
      "description": "A rewarding hike to a secluded waterfall, offering beautiful scenery and a chance to connect with nature. The hike is a 2-hour round trip and the trail can be muddy after rain.\n\nDuration to get there by transport: 1 hour taking the bus from the city center.",
      "lat": ${validatedData.location.latitude + 0.02},
      "long": ${validatedData.location.longitude - 0.03},
      "landscape": "forest",
      "activity": "hiking"
    }
  `;

  let responseText = ""; // Declare with wider scope

  try {
    const config = {
      // Renamed and will be passed as 'config'
      safetySettings: safetySettings,
      // responseMimeType: "application/json", // Request JSON output not supported by gemma
    };

    const result = await genAI.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: prompt }] }], // Structured content
      config: config, // Pass the generation config under the 'config' property
    });

    // According to the documentation for ai.models.generateContent,
    // the 'result' object should directly have a 'text' property.
    if (result && typeof result.text === "string") {
      responseText = result.text;
    } else {
      console.error("AI response did not return text as expected:", result);
      let errorDetail = "AI response missing or has unexpected format.";
      if (result && result.promptFeedback) {
        errorDetail += ` Feedback: ${JSON.stringify(result.promptFeedback)}`;
      } else if (result && result.candidates && result.candidates.length > 0) {
        // This case should ideally not be hit if result.text is the primary way
        errorDetail +=
          ` Candidates found but no direct text. First candidate: ${
            JSON.stringify(result.candidates[0])
          }`;
      }
      // Ensure we return an error object that the client-side can understand
      return { error: errorDetail };
    }

    console.log("AI Raw Response Text:", responseText);

    // Attempt to parse the JSON response
    // If responseMimeType: "application/json" works well, this cleaning might not be needed.
    let cleanedJsonText = responseText.trim();
    if (cleanedJsonText.startsWith("```json")) {
      cleanedJsonText = cleanedJsonText.substring(7);
      if (cleanedJsonText.endsWith("```")) {
        cleanedJsonText = cleanedJsonText.substring(
          0,
          cleanedJsonText.length - 3,
        );
      }
    }
    cleanedJsonText = cleanedJsonText.trim(); // Trim again after stripping markdown

    const tripData = JSON.parse(cleanedJsonText);
    console.log("Parsed AI Response Data:", tripData);
    return { data: tripData };
  } catch (apiError: any) {
    console.error("GenAI API Error or JSON parsing error:", apiError);
    let errorMessage = "Failed to get trip suggestions from AI.";
    if (apiError.message) {
      errorMessage += ` Details: ${apiError.message}`;
    }
    // Check if responseText was populated before error occurred during parsing
    if (
      responseText &&
      apiError instanceof SyntaxError &&
      apiError.message.includes("JSON")
    ) {
      errorMessage += ` Raw AI output: ${responseText}`;
    }
    return { error: errorMessage };
  }
}
