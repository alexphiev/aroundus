import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MapResult from "@/components/map/MapResult";
import { getSavedTripsAction } from "@/actions/save-trip.actions";

export default async function AppPage() {
  const supabase = await createClient(); // Await due to server.ts's potential async nature

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    // This should ideally be handled by middleware, but as a safeguard:
    redirect("/sign-in");
  }

  // Fetch the user's saved trips
  const tripsResult = await getSavedTripsAction();

  // Map the saved trips to the format expected by MapResult
  const tripResults =
    tripsResult.success && tripsResult.data
      ? tripsResult.data.map((trip) => ({
          id: trip.id,
          name: trip.name,
          description: trip.description || "",
          lat: trip.lat || 0,
          long: trip.long || 0,
          created_at: trip.created_at,
        }))
      : null;

  return (
    <MapResult
      tripResults={tripResults}
      title="Your Saved Places"
      subtitle="View and explore places you've saved"
      showSaveButton={false}
      emptyStateMessage="You haven't saved any places yet"
    />
  );
}
