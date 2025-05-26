"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, MapPin, Filter, Search, Mountain } from "lucide-react";
import TripMap from "@/components/map/TripMap";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { saveTripAction } from "@/app/(app)/search-trip/saveTripActions";
import { toast } from "sonner";

// TripResultItem that matches what's coming from the database
export interface TripResultItem {
  id?: string;
  name: string;
  description: string;
  lat: number;
  long: number;
  landscape?:
    | "mountain"
    | "forest"
    | "lake"
    | "beach"
    | "river"
    | "park"
    | "wetland"
    | "desert"
    | string;
  activity?:
    | "hiking"
    | "biking"
    | "camping"
    | "photography"
    | "wildlife"
    | "walking"
    | "swimming"
    | string;
  created_at?: string;
}

interface MapResultProps {
  tripResults: TripResultItem[] | null;
  title: string;
  subtitle: string;
  onSearchClick?: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
  showSaveButton?: boolean;
  emptyStateMessage?: string;
  isLoading?: boolean;
  className?: string;
  onSaveTrip?: (trip: TripResultItem) => Promise<void>;
}

export default function MapResult({
  tripResults,
  title,
  subtitle,
  onSearchClick,
  userLocation,
  showSaveButton = true,
  emptyStateMessage = "No trips to display",
  isLoading = false,
  className = "",
  onSaveTrip,
}: MapResultProps) {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Save trip handler
  const handleSaveTrip = async (trip: TripResultItem) => {
    if (!showSaveButton) return;

    setIsSaving(true);

    if (onSaveTrip) {
      // Use the provided save function if available
      await onSaveTrip(trip);
    } else {
      // Default save logic
      toast.info(`Saving "${trip.name}"...`);

      const tripToSave = {
        name: trip.name,
        description: trip.description,
        lat: trip.lat,
        long: trip.long,
      };

      const result = await saveTripAction(tripToSave);

      if (result.success) {
        toast.success(`"${trip.name}" saved successfully!`);
      } else {
        toast.error(result.error || "Failed to save trip. Please try again.");
      }
    }

    setIsSaving(false);
  };

  // Get landscape icon (simplified version)
  const getLandscapeIcon = (landscape?: string) => {
    return <Mountain className="h-5 w-5" />;
  };

  // Get activity icon (simplified version)
  const getActivityIcon = (activity?: string) => {
    return <Mountain className="h-5 w-5" />;
  };

  return (
    <div className={`container mx-auto py-6 px-4 md:px-6 ${className}`}>
      {/* Main Content */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column - Trip Cards */}
        <div className="w-full md:w-1/2 lg:w-2/5">
          <div className="sticky top-20">
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground mb-6">{subtitle}</p>

            {/* Loading State */}
            {isLoading && (
              <div className="bg-muted rounded-lg p-8 text-center">
                <div className="relative w-40 h-40 mx-auto mb-4">
                  <Image
                    src="/images/mountain-loading.svg"
                    alt="Loading mountain scenery"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-lg text-muted-foreground">
                  Loading places...
                </p>
              </div>
            )}

            {/* No Results */}
            {!isLoading && (!tripResults || tripResults.length === 0) && (
              <div className="bg-muted rounded-lg p-8 text-center">
                <p className="text-lg mb-4">{emptyStateMessage}</p>
                {onSearchClick && (
                  <Button onClick={onSearchClick}>
                    <Filter className="mr-2 h-4 w-4" />
                    Search Places
                  </Button>
                )}
              </div>
            )}

            {/* Trip Results Grid */}
            {!isLoading && tripResults && tripResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tripResults.map((trip, index) => (
                  <Card
                    key={trip.id || index}
                    className={`cursor-pointer transition-all hover:shadow-lg ${activeCardIndex === index ? "ring-2 ring-primary" : ""}`}
                    onClick={() => {
                      setActiveCardIndex(index);
                    }}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-1">
                          {trip.landscape && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="bg-primary/10 p-1 rounded-full">
                                    {getLandscapeIcon(trip.landscape)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="capitalize">{trip.landscape}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {trip.activity && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="bg-primary/10 p-1 rounded-full">
                                    {getActivityIcon(trip.activity)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="capitalize">{trip.activity}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>

                        {showSaveButton && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={isSaving}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveTrip(trip);
                            }}
                          >
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <CardTitle className="text-lg mt-2">
                        {trip.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardDescription className="line-clamp-2">
                        {trip.description}
                      </CardDescription>
                      <div className="flex items-center text-xs text-muted-foreground mt-2">
                        <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          GPS: {trip.lat.toFixed(4)}, {trip.long.toFixed(4)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Map */}
        <div className="w-full md:w-1/2 lg:w-3/5 h-[calc(100vh-150px)] sticky top-20">
          <div className="rounded-lg overflow-hidden h-full border">
            {tripResults && tripResults.length > 0 ? (
              <TripMap
                tripResults={tripResults.map((trip) => ({
                  name: trip.name,
                  description: trip.description,
                  lat: trip.lat,
                  long: trip.long,
                  landscape: trip.landscape as any,
                  activity: trip.activity as any,
                }))}
                userLocation={userLocation}
                activeMarkerIndex={activeCardIndex}
                className="h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/30">
                <div className="text-center p-6">
                  <Mountain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    {emptyStateMessage}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {onSearchClick
                      ? "Use the search button to find places"
                      : "Save places to see them on the map"}
                  </p>
                  {onSearchClick && (
                    <Button onClick={onSearchClick}>
                      <Search className="mr-2 h-4 w-4" />
                      Search Places
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
