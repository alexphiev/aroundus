"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TripResultItem } from "@/types/result.types";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Backpack,
  Bike,
  Bookmark,
  Camera,
  Car,
  Clock,
  Droplets,
  Flower2,
  Footprints,
  Info,
  MapPin,
  Mountain,
  Navigation,
  PawPrint,
  Share2,
  Star,
  Sun,
  TentTree,
  Timer,
  TreePine,
  Trees,
  Waves,
} from "lucide-react";

interface PlaceDetailViewProps {
  place: TripResultItem;
  onBack: () => void;
  onSave?: (place: TripResultItem) => Promise<void>;
  isSaved?: boolean;
  showSaveButton?: boolean;
}

export default function PlaceDetailView({
  place,
  onBack,
  onSave,
  isSaved = false,
  showSaveButton = true,
}: PlaceDetailViewProps) {
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

  // Get star rating label
  const getStarRatingLabel = (rating?: number) => {
    switch (rating) {
      case 3:
        return "Must-Visit";
      case 2:
        return "Excellent";
      case 1:
        return "Hidden Gem";
      default:
        return "Place";
    }
  };

  // Handle save action
  const handleSave = async () => {
    if (onSave) {
      await onSave(place);
    }
  };

  // Handle get directions
  const handleGetDirections = () => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.long}`;
    window.open(googleMapsUrl, "_blank");
  };

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: place.name,
          text: place.description,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(
          `${place.name}: ${place.description}\n\nLocation: ${place.lat}, ${place.long}`
        );
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(
        `${place.name}: ${place.description}\n\nLocation: ${place.lat}, ${place.long}`
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      {/* Header with Back Button and Actions */}
      <div className="flex-shrink-0 p-6 pb-4 bg-background border-b">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Places
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            {showSaveButton && (
              <Button
                variant={isSaved ? "secondary" : "outline"}
                size="sm"
                onClick={handleSave}
              >
                <Bookmark
                  className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`}
                />
                {isSaved ? "Saved" : "Save"}
              </Button>
            )}
          </div>
        </div>

        {/* Place Title and Rating */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{place.name}</h1>
            {place.starRating && (
              <div className="flex items-center gap-1">
                {Array.from({ length: place.starRating }, (_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="text-sm font-medium text-muted-foreground ml-1">
                  {getStarRatingLabel(place.starRating)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">About This Place</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {place.description}
            </p>
          </CardContent>
        </Card>

        {/* Quick Info Grid */}
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

        {/* Timing Information */}
        {(place.bestTimeToVisit || place.timeToAvoid) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Best Times to Visit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {place.bestTimeToVisit && (
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 mb-1">
                      Recommended Time
                    </p>
                    <p className="text-sm text-green-700">
                      {place.bestTimeToVisit}
                    </p>
                  </div>
                </div>
              )}
              {place.timeToAvoid && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-orange-800 mb-1">
                      Times to Avoid
                    </p>
                    <p className="text-sm text-orange-700">
                      {place.timeToAvoid}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Why Recommended */}
        {place.whyRecommended && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Why We Recommend This Place
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {place.whyRecommended}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Location Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Coordinates:</span>
              <Badge variant="outline" className="font-mono text-sm">
                {place.lat.toFixed(6)}, {place.long.toFixed(6)}
              </Badge>
            </div>
            <Button onClick={handleGetDirections} className="w-full" size="lg">
              <Navigation className="h-5 w-5 mr-2" />
              Get Directions
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
