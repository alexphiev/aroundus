import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DiscoveryResult from "@/components/discovery/result/DiscoveryResult";
import { getSavedTripsAction } from "@/actions/place.actions";

export default async function PastTripsPage() {
  const supabase = await createClient(); // Await due to server.ts's potential async nature

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    // This should ideally be handled by middleware, but as a safeguard:
    redirect("/sign-in");
  }

  const savedTripsResult = await getSavedTripsAction();
  const tripResults =
    savedTripsResult.success && savedTripsResult.data
      ? savedTripsResult.data.map((trip: any) => ({
          id: trip.id,
          name: trip.name || "Unnamed Place",
          description: trip.description || "",
          lat: trip.lat || 0,
          long: trip.long || 0,
          created_at: trip.created_at,
        }))
      : null;

  return (
    <DiscoveryResult
      tripResults={tripResults}
      title="Your Saved Places"
      subtitle="View and explore places you've saved"
      showSaveButton={false}
      emptyStateMessage="You haven't saved any places yet"
    />
  );
}
