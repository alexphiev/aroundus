"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bike,
  Bird,
  Bookmark,
  Camera,
  Compass,
  Footprints,
  Loader2,
  MapPin,
  Mountain,
  Tent,
  TreePine,
  Waves,
  X,
} from "lucide-react";
import TripMap from "@/components/map/TripMap";
import type { SearchResult } from "@/types/search-history.types";

// Use SearchResult as TripResult for consistency
type TripResult = SearchResult;

// Get landscape icon
const getLandscapeIcon = (landscape: TripResult["landscape"]) => {
  switch (landscape) {
    case "mountain":
      return <Mountain className="h-5 w-5" />;
    case "forest":
      return <TreePine className="h-5 w-5" />;
    case "beach":
    case "lake":
    case "river":
      return <Waves className="h-5 w-5" />;
    default:
      return <Mountain className="h-5 w-5" />;
  }
};

// Get activity icon
const getActivityIcon = (activity: TripResult["activity"]) => {
  switch (activity) {
    case "hiking":
      return <Footprints className="h-5 w-5" />;
    case "biking":
      return <Bike className="h-5 w-5" />;
    case "camping":
      return <Tent className="h-5 w-5" />;
    case "photography":
      return <Camera className="h-5 w-5" />;
    case "wildlife":
      return <Bird className="h-5 w-5" />;
    case "walking":
      return <Footprints className="h-5 w-5" />;
    case "swimming":
      return <Waves className="h-5 w-5" />;
    default:
      return <Compass className="h-5 w-5" />;
  }
};

// Trip Details Modal Props
interface TripDetailsModalProps {
  selectedTrip: TripResult | null;
  onClose: () => void;
  userLocation: { latitude: number; longitude: number } | null;
  onSaveTrip: (trip: TripResult) => void;
  isSaving: boolean;
}

export function TripDetailsModal({
  selectedTrip,
  onClose,
  userLocation,
  onSaveTrip,
  isSaving,
}: TripDetailsModalProps) {
  if (!selectedTrip) return null;

  return (
    <Dialog open={!!selectedTrip} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <div className="absolute right-4 top-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <DialogHeader className="pt-6">
          <div className="flex gap-2 mb-2">
            <div className="bg-primary/10 p-1 rounded-full">
              {getLandscapeIcon(selectedTrip.landscape)}
            </div>
            <div className="bg-primary/10 p-1 rounded-full">
              {getActivityIcon(selectedTrip.activity)}
            </div>
          </div>
          <DialogTitle>{selectedTrip.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p>{selectedTrip.description}</p>

          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>
              GPS: {selectedTrip.lat.toFixed(6)}, {selectedTrip.long.toFixed(6)}
            </span>
          </div>

          <div className="h-64 rounded-lg overflow-hidden">
            <TripMap
              tripResults={[selectedTrip]}
              userLocation={userLocation}
              activeMarkerIndex={0}
              className="h-full"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onSaveTrip(selectedTrip)} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bookmark className="mr-2 h-4 w-4" />
            )}
            Save Trip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
