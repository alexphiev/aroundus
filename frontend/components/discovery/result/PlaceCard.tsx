"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Star, Clock, AlertTriangle } from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { TripResultItem } from "@/types/result.types";
import {
  getLandscapeIcon,
  getActivityIcon,
} from "@/components/discovery/utils/iconUtils";

interface TripResultCardProps {
  trip: TripResultItem;
  index: number;
  isActive: boolean;
  isSaved: boolean;
  showSaveButton: boolean;
  isSaving: boolean;
  onClick: () => void;
  onSave: (e: React.MouseEvent) => void;
}

export default function TripResultCard({
  trip,
  index,
  isActive,
  isSaved,
  showSaveButton,
  isSaving,
  onClick,
  onSave,
}: TripResultCardProps) {
  // Helper function to abbreviate duration strings
  const abbreviateDuration = (duration: string) => {
    return duration
      .replace(/hours?/gi, "h")
      .replace(/minutes?/gi, "m")
      .replace(/days?/gi, "d")
      .replace(/weeks?/gi, "w")
      .replace(/\s+/g, " ")
      .trim();
  };

  return (
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
        className={`cursor-pointer transition-all hover:shadow-lg h-full flex flex-col ${
          isActive ? "ring-2 ring-primary" : ""
        }`}
        onClick={onClick}
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
                className={`h-8 w-8 ${isSaved ? "text-primary" : ""}`}
                disabled={isSaving}
                onClick={onSave}
              >
                <Bookmark
                  className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`}
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
                  <p className="text-sm">{trip.whyRecommended}</p>
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
                {Array.from({ length: trip.starRating }, (_, i) => (
                  <Star
                    key={i}
                    className="h-3 w-3 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  {trip.starRating === 3 && "Must-Visit"}
                  {trip.starRating === 2 && "Excellent"}
                  {trip.starRating === 1 && "Hidden Gem"}
                </span>
              </div>
            )}

            {/* Duration Information - Single Row */}
            {(trip.estimatedActivityDuration ||
              trip.estimatedTransportTime) && (
              <div className="flex gap-2 flex-wrap">
                {trip.estimatedActivityDuration && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Activity:{" "}
                    {abbreviateDuration(trip.estimatedActivityDuration)}
                  </span>
                )}
                {trip.estimatedTransportTime && (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    Travel: {abbreviateDuration(trip.estimatedTransportTime)}
                  </span>
                )}
              </div>
            )}

            {/* Best Time to Visit & Times to Avoid */}
            {(trip.bestTimeToVisit || trip.timeToAvoid) && (
              <div className="space-y-2">
                {trip.bestTimeToVisit && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                    <Clock className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700 line-clamp-1">
                      Best: {trip.bestTimeToVisit}
                    </p>
                  </div>
                )}
                {trip.timeToAvoid && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
                    <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0" />
                    <p className="text-xs text-red-700 line-clamp-1">
                      Avoid: {trip.timeToAvoid}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
