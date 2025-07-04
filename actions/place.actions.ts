"use server";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

// Define the structure of a trip to be saved, matching the TripResult and table schema
const TripDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  lat: z.number(),
  long: z.number(),
  landscape: z.string().optional(),
  activity: z.string().optional(),
  estimatedActivityDuration: z.string().optional(),
  estimatedTransportTime: z.string().optional(),
  whyRecommended: z.string().optional(),
  starRating: z.number().optional(),
  bestTimeToVisit: z.string().optional(),
  timeToAvoid: z.string().optional(),
  // Enhanced location data from Google Search
  googleMapsLink: z.string().optional(),
  operatingHours: z.string().optional(),
  entranceFee: z.string().optional(),
  parkingInfo: z.string().optional(),
  currentConditions: z.string().optional(),
});

export type TripToSave = z.infer<typeof TripDataSchema>;

export async function getSavedTripsAction() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated to get saved trips:", userError);
    return { error: "Authentication required to get saved trips." };
  }

  try {
    const { data, error } = await supabase
      .from("saved_places")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Supabase error getting saved trips:", error);
      return { error: `Failed to get saved trips: ${error.message}` };
    }

    return { success: true, data: data || [] };
  } catch (e: any) {
    console.error("Unexpected error getting saved trips:", e);
    return { error: `An unexpected error occurred: ${e.message || "Unknown error"}` };
  }
}

export async function saveTripAction(tripData: TripToSave) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated to save trip:", userError);
    return { error: "Authentication required to save trips." };
  }

  const parseResult = TripDataSchema.safeParse(tripData);
  if (!parseResult.success) {
    console.error("Invalid trip data for saving:", parseResult.error.flatten());
    return {
      error: "Invalid trip data provided.",
      details: parseResult.error.flatten(),
    };
  }

  const { 
    name, 
    description, 
    lat, 
    long, 
    landscape,
    activity,
    estimatedActivityDuration,
    estimatedTransportTime,
    whyRecommended,
    starRating,
    bestTimeToVisit,
    timeToAvoid,
    googleMapsLink,
    operatingHours,
    entranceFee,
    parkingInfo,
    currentConditions
  } = parseResult.data;

  try {
    const { data, error } = await supabase
      .from("saved_places")
      .insert([
        {
          user_id: user.id,
          name,
          description,
          lat,
          long,
          landscape,
          activity,
          estimatedActivityDuration,
          estimatedTransportTime,
          whyRecommended,
          starRating,
          bestTimeToVisit,
          timeToAvoid,
          googleMapsLink,
          operatingHours,
          entranceFee,
          parkingInfo,
          currentConditions,
        },
      ])
      .select();

    if (error) {
      console.error("Supabase error saving trip:", error);
      if (error.code === "23503" && error.message?.includes("auth.users")) {
        return {
          error:
            "Failed to save trip due to a user reference issue. Please try again.",
        };
      }
      if (error.code === "42501") {
        // RLS violation
        return {
          error:
            "You don't have permission to save this trip. Please ensure you are logged in.",
        };
      }
      return {
        error: `Failed to save trip: ${
          error.message || "Unknown Supabase error"
        }`,
      };
    }

    console.log("Trip saved successfully:", data);
    return { success: true, data };
  } catch (e: any) {
    console.error("Unexpected error saving trip:", e);
    return {
      error: `An unexpected error occurred: ${e.message || "Unknown error"}`,
    };
  }
}
