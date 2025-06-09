"use server";

import { createClient } from "@/utils/supabase/server";
import { Database } from "database-types";

export interface SavedTrip {
  id: string;
  user_id: string | null;
  created_at: string;
  name: string;
  description: string | null;
  lat: number | null;
  long: number | null;
  activity: string | null;
  landscape: string | null;
}

export async function getSavedTripsAction(): Promise<{
  success?: boolean;
  data?: Database["public"]["Tables"]["saved_places"]["Row"][];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated to fetch saved trips:", userError);
    return { error: "Authentication required to view saved trips." };
  }

  try {
    const { data, error } = await supabase
      .from("saved_places")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching saved trips:", error);
      if (error.code === "42501") {
        // RLS violation
        return { error: "You don't have permission to view these trips." };
      }
      return { error: `Failed to fetch saved trips: ${error.message}` };
    }

    return { success: true, data }; // Type assertion
  } catch (e: any) {
    console.error("Unexpected error fetching saved trips:", e);
    return {
      error: `An unexpected error occurred: ${e.message || "Unknown error"}`,
    };
  }
}

export async function deleteSavedTripAction(tripId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated to delete trip:", userError);
    return { error: "Authentication required to delete trips." };
  }

  if (!tripId) {
    return { error: "Trip ID is required to delete." };
  }

  try {
    const { error } = await supabase
      .from("saved_places")
      .delete()
      .eq("user_id", user.id) // Ensure user can only delete their own trips
      .eq("id", tripId);

    if (error) {
      console.error("Supabase error deleting saved trip:", error);
      if (error.code === "42501") {
        // RLS violation
        return { error: "You don't have permission to delete this trip." };
      }
      return { error: `Failed to delete trip: ${error.message}` };
    }
    return { success: true };
  } catch (e: any) {
    console.error("Unexpected error deleting saved trip:", e);
    return {
      error: `An unexpected error occurred: ${e.message || "Unknown error"}`,
    };
  }
}
