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
        className={`card-interactive card-layout ${
          isActive ? "card-active" : ""
        }`}
        onClick={onClick}
      >
        <CardHeader className="layout-card-header">
          <div className="layout-flex-between">
            <div className="flex gap-1">
              {trip.landscape && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="icon-container">
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
                      <div className="icon-container">
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
          <CardTitle className="text-card-title mt-2">
            {trip.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="layout-card-content">
          {/* Why Recommended with Tooltip */}
          {trip.whyRecommended ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardDescription className="text-card-description mb-3 flex-shrink-0 cursor-help">
                    {trip.whyRecommended}
                  </CardDescription>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm p-3">
                  <p className="text-sm">{trip.whyRecommended}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <CardDescription className="text-card-description mb-3 flex-shrink-0">
              {trip.description}
            </CardDescription>
          )}

          <div className="flex-1 space-content">
            {/* Star Rating Badge */}
            {trip.starRating && (
              <div className="flex items-center gap-1">
                {Array.from({ length: trip.starRating }, (_, i) => (
                  <Star
                    key={i}
                    className="h-3 w-3 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="text-meta ml-1">
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
                  <span className="badge-info">
                    Activity:{" "}
                    {abbreviateDuration(trip.estimatedActivityDuration)}
                  </span>
                )}
                {trip.estimatedTransportTime && (
                  <span className="badge-warning">
                    Travel: {abbreviateDuration(trip.estimatedTransportTime)}
                  </span>
                )}
              </div>
            )}

            {/* Best Time to Visit & Times to Avoid */}
            {(trip.bestTimeToVisit || trip.timeToAvoid) && (
              <div className="space-tight">
                {trip.bestTimeToVisit && (
                  <div className="layout-flex-start p-2 bg-status-success rounded-md">
                    <Clock className="h-3 w-3 text-status-success-foreground flex-shrink-0" />
                    <p className="text-xs text-status-success-foreground line-clamp-1">
                      Best: {trip.bestTimeToVisit}
                    </p>
                  </div>
                )}
                {trip.timeToAvoid && (
                  <div className="layout-flex-start p-2 bg-status-error rounded-md">
                    <AlertTriangle className="h-3 w-3 text-status-error-foreground flex-shrink-0" />
                    <p className="text-xs text-status-error-foreground line-clamp-1">
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
