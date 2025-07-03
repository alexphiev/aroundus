"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TripResultItem } from "@/types/result.types";
import {
  Backpack,
  Bike,
  Camera,
  Car,
  Droplets,
  Flower2,
  Footprints,
  Mountain,
  PawPrint,
  Sun,
  TentTree,
  Timer,
  TreePine,
  Trees,
  Waves,
} from "lucide-react";

interface PlaceInfoGridProps {
  place: TripResultItem;
}

export default function PlaceInfoGrid({ place }: PlaceInfoGridProps) {
  // Get landscape icon based on type
  const getLandscapeIcon = (landscape?: string) => {
    switch (landscape?.toLowerCase()) {
      case "mountain":
        return <Mountain className="h-6 w-6" />;
      case "forest":
        return <Trees className="h-6 w-6" />;
      case "lake":
        return <Waves className="h-6 w-6" />;
      case "beach":
        return <Sun className="h-6 w-6" />;
      case "river":
        return <Droplets className="h-6 w-6" />;
      case "park":
        return <Flower2 className="h-6 w-6" />;
      case "wetland":
        return <Droplets className="h-6 w-6" />;
      case "desert":
        return <Sun className="h-6 w-6" />;
      default:
        return <TreePine className="h-6 w-6" />;
    }
  };

  // Get activity icon based on type
  const getActivityIcon = (activity?: string) => {
    switch (activity?.toLowerCase()) {
      case "hiking":
        return <Backpack className="h-6 w-6" />;
      case "biking":
        return <Bike className="h-6 w-6" />;
      case "camping":
        return <TentTree className="h-6 w-6" />;
      case "photography":
        return <Camera className="h-6 w-6" />;
      case "wildlife":
        return <PawPrint className="h-6 w-6" />;
      case "walking":
        return <Footprints className="h-6 w-6" />;
      case "swimming":
        return <Waves className="h-6 w-6" />;
      default:
        return <Mountain className="h-6 w-6" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Environment & Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Environment & Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-full">
              {getLandscapeIcon(place.landscape)}
            </div>
            <div>
              <p className="font-medium">Environment</p>
              <p className="text-sm text-muted-foreground capitalize">
                {place.landscape || "Natural area"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-full">
              {getActivityIcon(place.activity)}
            </div>
            <div>
              <p className="font-medium">Activity Type</p>
              <p className="text-sm text-muted-foreground capitalize">
                {place.activity || "Outdoor activity"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duration & Travel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Duration & Travel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {place.estimatedActivityDuration && (
            <div className="flex items-center gap-3">
              <Timer className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium">Activity Duration</p>
                <p className="text-sm text-muted-foreground">
                  {place.estimatedActivityDuration}
                </p>
              </div>
            </div>
          )}
          {place.estimatedTransportTime && (
            <div className="flex items-center gap-3">
              <Car className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium">Travel Time</p>
                <p className="text-sm text-muted-foreground">
                  {place.estimatedTransportTime}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}