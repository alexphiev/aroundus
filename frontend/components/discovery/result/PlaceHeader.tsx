"use client";

import { Button } from "@/components/ui/button";
import { TripResultItem } from "@/types/result.types";
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Star,
} from "lucide-react";

interface PlaceHeaderProps {
  place: TripResultItem;
  onBack: () => void;
  onSave?: (place: TripResultItem) => Promise<void>;
  onShare: () => void;
  isSaved?: boolean;
  showSaveButton?: boolean;
}

export default function PlaceHeader({
  place,
  onBack,
  onSave,
  onShare,
  isSaved = false,
  showSaveButton = true,
}: PlaceHeaderProps) {
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

  return (
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
          <Button variant="outline" size="sm" onClick={onShare}>
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
  );
}