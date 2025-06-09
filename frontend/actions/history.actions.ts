"use server";

import { createClient } from "@/utils/supabase/server";
import * as z from "zod";
import type {
  SaveSearchResponse,
  SearchHistoryResponse,
  SearchQuery,
  SearchResult,
} from "@/types/search-history.types";

// Schema for search criteria
const searchCriteriaSchema = z.object({
  specialCare: z.enum(["children", "lowMobility", "dogs"]).optional(),
  distanceValue: z.number(),
  distanceUnit: z.enum(["minutes", "hours"]),
  activityLevel: z.number().min(1).max(5),
  activityDurationValue: z.number(),
  activityDurationUnit: z.enum(["hours", "days"]),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

// Schema for search results
const searchResultSchema = z.object({
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
});

// Save search to history
export async function saveSearchToHistory(
  query: SearchQuery,
  results: SearchResult[],
): Promise<SaveSearchResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "User not authenticated for saving search history:",
      userError,
    );
    return { error: "User not authenticated. Please sign in again." };
  }

  try {
    // Validate the data
    const validatedQuery = searchCriteriaSchema.parse(query);
    const validatedResults = results.map((result) =>
      searchResultSchema.parse(result)
    );

    const { data, error } = await supabase
      .from("search_history")
      .insert({
        user_id: user.id,
        query: validatedQuery,
        results: validatedResults,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving search history:", error);
      return { error: "Failed to save search history." };
    }

    return { success: true, data: data as any };
  } catch (error) {
    console.error("Error validating or saving search history:", error);
    return { error: "Failed to save search history due to validation error." };
  }
}

// Get latest search from history
export async function getLatestSearchFromHistory(): Promise<
  SearchHistoryResponse
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "User not authenticated for getting search history:",
      userError,
    );
    return { error: "User not authenticated. Please sign in again." };
  }

  try {
    const { data, error } = await supabase
      .from("search_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No results found
        return { success: true, data: null };
      }
      console.error("Error getting latest search history:", error);
      return { error: "Failed to get search history." };
    }

    return { success: true, data: data as any };
  } catch (error) {
    console.error("Error getting latest search history:", error);
    return { error: "Failed to get search history." };
  }
}

// Get all search history for a user
export async function getUserSearchHistory(): Promise<SearchHistoryResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "User not authenticated for getting search history:",
      userError,
    );
    return { error: "User not authenticated. Please sign in again." };
  }

  try {
    const { data, error } = await supabase
      .from("search_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting user search history:", error);
      return { error: "Failed to get search history." };
    }

    return { success: true, data: (data || []) as any };
  } catch (error) {
    console.error("Error getting user search history:", error);
    return { error: "Failed to get search history." };
  }
}

// Delete a search from history
export async function deleteSearchFromHistory(
  searchId: string,
): Promise<SaveSearchResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "User not authenticated for deleting search history:",
      userError,
    );
    return { error: "User not authenticated. Please sign in again." };
  }

  try {
    const { error } = await supabase
      .from("search_history")
      .delete()
      .eq("id", searchId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting search history:", error);
      return { error: "Failed to delete search history." };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting search history:", error);
    return { error: "Failed to delete search history." };
  }
}
