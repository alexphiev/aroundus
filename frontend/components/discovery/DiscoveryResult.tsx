"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  MapPin,
  Filter,
  Search,
  Mountain,
  Star,
  Trees,
  Waves,
  TreePine,
  Droplets,
  Flower2,
  Sun,
  Loader2,
  Plus,
  Footprints,
  PawPrint,
  Camera,
  TentTree,
  Bike,
  Backpack,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import TripMap from "@/components/discovery/Map";
import PlaceDetailView from "@/components/discovery/PlaceDetailView";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import Image from "next/image";
import {
  saveTripAction,
  getSavedTripsAction,
} from "@/actions/save-trip.actions";
import { toast } from "sonner";
import { TripResultItem } from "@/types/result.types";

interface Props {
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
  progressiveStage?: string;
  isProgressiveComplete?: boolean;
  onNewSearch?: () => void;
  showNewSearchButton?: boolean;
  onCardClick?: (index: number) => void;
}

export default function DiscoveryResult({
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
  progressiveStage,
  isProgressiveComplete = true,
  onNewSearch,
  onCardClick,
}: Props) {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1); // No card selected by default
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedTripNames, setSavedTripNames] = useState<Set<string>>(new Set()); // Track saved trip names
  const [selectedPlace, setSelectedPlace] = useState<TripResultItem | null>(
    null
  );

  // Handle marker clicks from the map
  const handleMarkerClick = (index: number) => {
    setActiveCardIndex(index);
    if (onCardClick) {
      onCardClick(index);
    }
  };

  // Handle popup close from the map
  const handlePopupClose = () => {
    setActiveCardIndex(-1); // Deselect any active card
    if (onCardClick) {
      onCardClick(-1);
    }
  };

  // Handle card clicks to open detail view
  const handleCardClick = (index: number, place: TripResultItem) => {
    setActiveCardIndex(index);
    setSelectedPlace(place);
    if (onCardClick) {
      onCardClick(index);
    }
  };

  // Handle back to cards view
  const handleBackToCards = () => {
    setSelectedPlace(null);
    setActiveCardIndex(-1);
    if (onCardClick) {
      onCardClick(-1);
    }
  };

  // Load saved trips on component mount
  useEffect(() => {
    const loadSavedTrips = async () => {
      try {
        const result = await getSavedTripsAction();
        if (result.success && result.data) {
          const savedNames = new Set(result.data.map((trip: any) => trip.name));
          setSavedTripNames(savedNames);
        }
      } catch (error) {
        console.error("Failed to load saved trips:", error);
      }
    };

    loadSavedTrips();
  }, []);

  // Randomly select a loading GIF each time the component loads
  const loadingGif = useMemo(() => {
    const gifs = ["animals.gif", "lake.gif", "landscape.gif"];
    const randomIndex = Math.floor(Math.random() * gifs.length);
    return `/images/${gifs[randomIndex]}`;
  }, [isLoading]); // Re-select when isLoading changes

  // Save trip handler
  const handleSaveTrip = async (trip: TripResultItem) => {
    if (!showSaveButton) return;

    setIsSaving(true);

    if (onSaveTrip) {
      // Use the provided save function if available
      await onSaveTrip(trip);
      // Add to saved trips set after successful save
      setSavedTripNames((prev) => new Set(prev).add(trip.name));
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
        // Add to saved trips set after successful save
        setSavedTripNames((prev) => new Set(prev).add(trip.name));
      } else {
        toast.error(result.error || "Failed to save trip. Please try again.");
      }
    }

    setIsSaving(false);
  };

  // Get landscape icon based on type
  const getLandscapeIcon = (landscape?: string) => {
    switch (landscape?.toLowerCase()) {
      case "mountain":
        return <Mountain className="h-5 w-5" />;
      case "forest":
        return <Trees className="h-5 w-5" />;
      case "lake":
        return <Waves className="h-5 w-5" />;
      case "beach":
        return <Sun className="h-5 w-5" />;
      case "river":
        return <Droplets className="h-5 w-5" />;
      case "park":
        return <Flower2 className="h-5 w-5" />;
      case "wetland":
        return <Droplets className="h-5 w-5" />;
      case "desert":
        return <Sun className="h-5 w-5" />;
      default:
        return <TreePine className="h-5 w-5" />;
    }
  };

  // Get activity icon based on type
  const getActivityIcon = (activity?: string) => {
    switch (activity?.toLowerCase()) {
      case "hiking":
        return <Backpack className="h-5 w-5" />;
      case "biking":
        return <Bike className="h-5 w-5" />;
      case "camping":
        return <TentTree className="h-5 w-5" />;
      case "photography":
        return <Camera className="h-5 w-5" />;
      case "wildlife":
        return <PawPrint className="h-5 w-5" />;
      case "walking":
        return <Footprints className="h-5 w-5" />;
      case "swimming":
        return <Waves className="h-5 w-5" />;
      default:
        return <Mountain className="h-5 w-5" />;
    }
  };

  // Skeleton card component for loading state
  const SkeletonCard = () => (
    <Card className="h-full flex flex-col animate-pulse">
      <CardHeader className="p-4 pb-2 flex-shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex gap-1">
            <div className="bg-gray-200 h-7 w-7 rounded-full"></div>
            <div className="bg-gray-200 h-7 w-7 rounded-full"></div>
          </div>
          <div className="bg-gray-200 h-8 w-8 rounded"></div>
        </div>
        <div className="bg-gray-200 h-6 w-3/4 rounded mt-2"></div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col">
        <div className="bg-gray-200 h-4 w-full rounded mb-2"></div>
        <div className="bg-gray-200 h-4 w-2/3 rounded mb-3"></div>

        <div className="flex gap-2 mb-3">
          <div className="bg-gray-200 h-6 w-20 rounded"></div>
          <div className="bg-gray-200 h-6 w-16 rounded"></div>
        </div>

        <div className="flex items-center gap-1 mb-3">
          <div className="bg-gray-200 h-3 w-3 rounded"></div>
          <div className="bg-gray-200 h-3 w-3 rounded"></div>
          <div className="bg-gray-200 h-3 w-3 rounded"></div>
          <div className="bg-gray-200 h-3 w-16 rounded ml-1"></div>
        </div>

        <div className="bg-gray-200 h-3 w-full rounded mb-1"></div>
        <div className="bg-gray-200 h-3 w-3/4 rounded"></div>

        <div className="flex items-center text-xs mt-auto pt-2 border-t">
          <div className="bg-gray-200 h-3 w-3 rounded mr-1"></div>
          <div className="bg-gray-200 h-3 w-24 rounded"></div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`h-screen flex ml-[60px] ${className}`}>
      {/* Left Column - Conditional View */}
      <div className="w-full md:w-1/2 flex flex-col h-full">
        <AnimatePresence mode="wait">
          {selectedPlace ? (
            /* Detail View */
            <PlaceDetailView
              key="detail-view"
              place={selectedPlace}
              onBack={handleBackToCards}
              onSave={handleSaveTrip}
              isSaved={savedTripNames.has(selectedPlace.name)}
              showSaveButton={showSaveButton}
            />
          ) : (
            /* Cards List View */
            <motion.div
              key="cards-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full px-6"
            >
              {/* Fixed Title Header */}
              <div className="flex-shrink-0 pt-6 pb-4 bg-background">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{title}</h1>
                    <p className="text-muted-foreground">{subtitle}</p>
                  </div>
                  <Button
                    variant="default"
                    onClick={onNewSearch}
                    className="flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    New Search
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto py-4 pb-8 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {/* Loading State */}
                {isLoading && (
                  <div className="bg-muted rounded-lg p-8 text-center">
                    <div className="relative w-40 h-40 mx-auto mb-4 flex items-center justify-center">
                      <Image
                        src={loadingGif}
                        alt="Loading animation"
                        width={160}
                        height={160}
                        className="rounded-lg object-cover"
                        unoptimized
                      />
                    </div>
                    <p className="text-lg text-muted-foreground">
                      Searching for amazing places...
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
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      {!isProgressiveComplete && progressiveStage && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>
                            Finding {progressiveStage} destinations...
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <AnimatePresence>
                        {tripResults.map((trip, index) => (
                          <motion.div
                            key={trip.id || index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.1,
                              ease: "easeOut",
                            }}
                            layout
                          >
                            <Card
                              className={`cursor-pointer transition-all hover:shadow-lg h-full flex flex-col ${activeCardIndex === index ? "ring-2 ring-primary" : ""}`}
                              onClick={() => {
                                handleCardClick(index, trip);
                              }}
                            >
                              <CardHeader className="p-4 pb-2 flex-shrink-0">
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
                                            <p className="capitalize">
                                              {trip.landscape}
                                            </p>
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
                                            <p className="capitalize">
                                              {trip.activity}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>

                                  {showSaveButton && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-8 w-8 ${savedTripNames.has(trip.name) ? "text-primary" : ""}`}
                                      disabled={isSaving}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveTrip(trip);
                                      }}
                                    >
                                      <Bookmark
                                        className={`h-4 w-4 ${savedTripNames.has(trip.name) ? "fill-current" : ""}`}
                                      />
                                    </Button>
                                  )}
                                </div>
                                <CardTitle className="text-lg mt-2 line-clamp-2">
                                  {trip.name}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                                {/* Why Recommended with Tooltip */}
                                {trip.whyRecommended ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <CardDescription className="line-clamp-4 mb-3 flex-shrink-0 cursor-help">
                                          {trip.whyRecommended}
                                        </CardDescription>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm p-3">
                                        <p className="text-sm">
                                          {trip.whyRecommended}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <CardDescription className="line-clamp-4 mb-3 flex-shrink-0">
                                    {trip.description}
                                  </CardDescription>
                                )}

                                <div className="flex-1 space-y-3">
                                  {/* Star Rating Badge */}
                                  {trip.starRating && (
                                    <div className="flex items-center gap-1">
                                      {Array.from(
                                        { length: trip.starRating },
                                        (_, i) => (
                                          <Star
                                            key={i}
                                            className="h-3 w-3 fill-yellow-400 text-yellow-400"
                                          />
                                        )
                                      )}
                                      <span className="text-xs text-muted-foreground ml-1">
                                        {trip.starRating === 3 && "Must-Visit"}
                                        {trip.starRating === 2 && "Excellent"}
                                        {trip.starRating === 1 && "Hidden Gem"}
                                      </span>
                                    </div>
                                  )}

                                  {/* Duration Information */}
                                  {(trip.estimatedActivityDuration ||
                                    trip.estimatedTransportTime) && (
                                    <div className="flex gap-2 flex-wrap">
                                      {trip.estimatedActivityDuration && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                          Activity:{" "}
                                          {trip.estimatedActivityDuration}
                                        </span>
                                      )}
                                      {trip.estimatedTransportTime && (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                          Travel: {trip.estimatedTransportTime}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Best Time to Visit - Compact */}
                                  {trip.bestTimeToVisit && (
                                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                                      <Clock className="h-3 w-3 text-green-600 flex-shrink-0" />
                                      <p className="text-xs text-green-700 line-clamp-1">
                                        {trip.bestTimeToVisit}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}

                        {/* Show skeleton cards during progressive search */}
                        {!isProgressiveComplete && (
                          <>
                            {Array.from({ length: 4 }, (_, index) => (
                              <motion.div
                                key={`skeleton-${index}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{
                                  duration: 0.3,
                                  delay: (tripResults.length + index) * 0.1,
                                  ease: "easeOut",
                                }}
                                layout
                              >
                                <SkeletonCard />
                              </motion.div>
                            ))}
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Column - Map (Full Screen Height) */}
      <div className="w-full md:w-1/2 h-screen">
        <TripMap
          tripResults={
            tripResults && tripResults.length > 0
              ? tripResults.map((trip) => ({
                  name: trip.name,
                  description: trip.description,
                  lat: trip.lat,
                  long: trip.long,
                  landscape: trip.landscape as any,
                  activity: trip.activity as any,
                  starRating: trip.starRating,
                }))
              : []
          } // Pass empty array instead of null when no results
          userLocation={userLocation}
          activeMarkerIndex={activeCardIndex}
          className="h-full"
          shouldUpdateBounds={true}
          isProgressiveSearch={!isProgressiveComplete}
          onMarkerClick={handleMarkerClick}
          onPopupClose={handlePopupClose}
        />
      </div>
    </div>
  );
}
