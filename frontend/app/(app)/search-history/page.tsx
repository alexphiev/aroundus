"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getSavedTripsAction,
  deleteSavedTripAction,
  SavedTrip,
} from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Trash2, MapPin, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // For displaying travel time or activity level
import { format } from "date-fns"; // For formatting dates

export default function SearchHistoryPage() {
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [isLoading, startLoadingTransition] = useTransition();
  const [isDeleting, startDeletingTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fetchSavedTrips = async () => {
    startLoadingTransition(async () => {
      setError(null);
      const result = await getSavedTripsAction();
      if (result.success && result.data) {
        setSavedTrips(result.data);
      } else {
        setError(result.error || "Failed to load saved trips.");
        toast.error(result.error || "Failed to load saved trips.");
      }
    });
  };

  useEffect(() => {
    fetchSavedTrips();
  }, []);

  const handleDeleteTrip = async (tripId: string, tripName: string) => {
    // Basic confirmation, consider using a modal for better UX
    if (!confirm(`Are you sure you want to delete "${tripName}"?`)) {
      return;
    }
    startDeletingTransition(async () => {
      toast.info(`Deleting "${tripName}"...`);
      const result = await deleteSavedTripAction(tripId);
      if (result.success) {
        toast.success(`"${tripName}" deleted successfully.`);
        setSavedTrips((prevTrips) =>
          prevTrips.filter((trip) => trip.id !== tripId)
        );
      } else {
        toast.error(result.error || `Failed to delete "${tripName}".`);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error && savedTrips.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-destructive">
          Error Loading Trips
        </h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchSavedTrips} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Try Again
        </Button>
      </div>
    );
  }

  if (savedTrips.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <Info className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-4">No Saved Trips Yet</h1>
        <p className="text-lg text-muted-foreground mb-8">
          You haven't saved any nature trips. Start exploring and save your
          favorites!
        </p>
        <Button onClick={() => (window.location.href = "/search-trip")}>
          Find Trips
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Your Saved Trips</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedTrips.map((trip) => (
          <Card
            key={trip.id}
            className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <CardHeader>
              <CardTitle className="text-xl">{trip.name}</CardTitle>
              {trip.created_at && (
                <p className="text-xs text-muted-foreground">
                  Saved on: {format(new Date(trip.created_at), "PPP")}
                </p>
              )}
              {trip.description && (
                <CardDescription className="text-sm pt-2 line-clamp-3">
                  {trip.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center text-muted-foreground">
                <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>
                  GPS: {trip.gps_latitude.toFixed(4)},{" "}
                  {trip.gps_longitude.toFixed(4)}
                </span>
              </div>
              {trip.activity_notes && (
                <p>
                  <strong className="font-medium">Activities:</strong>{" "}
                  {trip.activity_notes}
                </p>
              )}
              {trip.estimated_travel_time && (
                <Badge variant="outline" className="mt-1">
                  Travel: {trip.estimated_travel_time}
                </Badge>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4 mt-auto">
              {/* <Button variant="outline" size="sm">View on Map</Button> */}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteTrip(trip.id, trip.name)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
