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
import { Bookmark, Star } from "lucide-react";
import { TripResultItem } from "@/types/result.types";
import { getTransportIcon } from "@/components/discovery/utils/iconUtils";
import PlaceIcons from "./PlaceIcons";

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
            <div className="flex gap-1 items-center">
              <PlaceIcons landscape={trip.landscape} activity={trip.activity} />

              {/* Star Rating */}
              {trip.starRating && (
                <div className="flex items-center gap-0.5 ml-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < (trip.starRating || 0)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
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
          <CardTitle className="text-card-title mt-2">{trip.name}</CardTitle>
        </CardHeader>
        <CardContent className="layout-card-content">
          {/* Why Recommended */}
          {trip.whyRecommended ? (
            <CardDescription className="text-card-description mb-3 flex-shrink-0">
              {trip.whyRecommended}
            </CardDescription>
          ) : (
            <CardDescription className="text-card-description mb-3 flex-shrink-0">
              {trip.description}
            </CardDescription>
          )}

          <div className="flex-1 space-content">
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
                  <span className="badge-warning flex items-center gap-1">
                    {getTransportIcon(trip.transportMode)}
                    {abbreviateDuration(trip.estimatedTransportTime)}
                  </span>
                )}
              </div>
            )}

            {/* Best Time to Visit - Bottom with 3-line limit */}
            {trip.bestTimeToVisit && (
              <div className="space-tight">
                <div className="p-2 bg-status-success rounded-md">
                  <p className="text-xs text-status-success-foreground leading-relaxed line-clamp-3">
                    Best: {trip.bestTimeToVisit}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
