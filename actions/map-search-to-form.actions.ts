"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { FormValues } from "@/types/search-history.types";
import { MODEL } from "@/constants/ai.constants";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const FormMappingSchema = z.object({
  activity: z.string(),
  when: z.string(),
  specialCare: z.enum(["children", "lowMobility", "dogs"]).nullable().optional(),
  distance: z.string(),
  activityLevel: z.number().min(1).max(5),
  activityDurationValue: z.number().min(1),
  activityDurationUnit: z.enum(["hours", "days"]),
  transportType: z.enum(["foot", "bike", "transit", "car"]),
  additionalInfo: z.string().optional(),
});

type FormMappingResult = z.infer<typeof FormMappingSchema>;

export async function mapSearchToFormFilters(
  searchQuery: string,
  shortcutType?: string,
): Promise<{ success: boolean; data?: Partial<FormValues>; error?: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL.GEMMA });

    const prompt = `
You are a helpful assistant that maps natural language search queries to form filters for a nature trip discovery app.

Given a search query${
      shortcutType ? ` or shortcut type "${shortcutType}"` : ""
    }, map it to the appropriate form values.

Available form options:

ACTIVITIES:
- "hiking" (Walking/Hiking)
- "cycling" (Cycling)
- "swimming" (Swimming)
- "photography" (Photography)
- "picnic" (Picnic)
- "wildlife" (Wildlife Watching)
- "relaxation" (Relaxation)
- "other" (Other - specify in additionalInfo)

WHEN:
- "today" (Today)
- "tomorrow" (Tomorrow)
- "this_weekend" (This Weekend)
- "custom" (Custom Date)

SPECIAL CARE:
- "children" (Child-friendly)
- "lowMobility" (Low Mobility Access)
- "dogs" (Dog-friendly)

DISTANCE:
- "30 minutes" (30 minutes)
- "1 hour" (1 hour)
- "2 hours" (2 hours)
- "3 hours" (3 hours)
- "1 day" (Full day)

TRANSPORT TYPE:
- "foot" (Walking)
- "bike" (Cycling)
- "transit" (Public Transport)
- "car" (Car)

ACTIVITY LEVEL (1-5):
- 1: Very easy (minimal walking)
- 2: Easy (light walking)
- 3: Moderate (some hiking)
- 4: Hard (challenging hikes)
- 5: Very hard (extreme activities)

ACTIVITY DURATION:
- Value: 1-24 (number)
- Unit: "hours" or "days"

Search query: "${searchQuery}"
${shortcutType ? `Shortcut type: "${shortcutType}"` : ""}

Return a JSON object with the mapped form values. Use reasonable defaults and inference. If the query is ambiguous, choose the most likely option.

For shortcut types:
- "feeling-lucky": Set activity as "other" and put "surprise me with something unique" in additionalInfo
- "exercise": Set activity as "hiking", activityLevel as 4, focus on physical activities
- "relax": Set activity as "relaxation", activityLevel as 1-2, focus on peaceful activities
- "something-new": Set activity as "other" and put "looking for unique experiences" in additionalInfo

Example response:
{
  "activity": "hiking",
  "when": "today",
  "specialCare": "children",
  "distance": "1 hour",
  "activityLevel": 3,
  "activityDurationValue": 4,
  "activityDurationUnit": "hours",
  "transportType": "car",
  "additionalInfo": "Looking for family-friendly hiking trails with scenic views"
}

Only return the JSON object, no other text.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let parsedResponse: FormMappingResult;
    try {
      // Clean the response by removing markdown code blocks if present
      let cleanedText = text.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", text);
      return {
        success: false,
        error: "Failed to parse AI response",
      };
    }

    // Validate the response
    const validationResult = FormMappingSchema.safeParse(parsedResponse);
    if (!validationResult.success) {
      console.error("Invalid AI response format:", validationResult.error);
      return {
        success: false,
        error: "Invalid response format from AI",
      };
    }

    // Convert null values to undefined for form compatibility
    const formData: Partial<FormValues> = {
      ...validationResult.data,
      specialCare: validationResult.data.specialCare || undefined,
    };

    return {
      success: true,
      data: formData,
    };
  } catch (error) {
    console.error("Error mapping search to form filters:", error);
    return {
      success: false,
      error: "Failed to map search query to form filters",
    };
  }
}
