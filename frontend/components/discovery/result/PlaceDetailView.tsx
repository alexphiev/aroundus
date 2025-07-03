"use client";

import { TripResultItem } from "@/types/result.types";
import { motion } from "framer-motion";
import PlaceHeader from "./PlaceHeader";
import PlaceDescription from "./PlaceDescription";
import PlaceInfoGrid from "./PlaceInfoGrid";
import PlaceTimingInfo from "./PlaceTimingInfo";
import PlaceRecommendation from "./PlaceRecommendation";
import WeatherForecast from "./WeatherForecast";
import PlaceLocationDetails from "./PlaceLocationDetails";

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
      <PlaceHeader
        place={place}
        onBack={onBack}
        onSave={onSave}
        onShare={handleShare}
        isSaved={isSaved}
        showSaveButton={showSaveButton}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <PlaceDescription description={place.description} />

        {/* Quick Info Grid */}
        <PlaceInfoGrid place={place} />

        {/* Timing Information */}
        <PlaceTimingInfo place={place} />

        {/* Why Recommended */}
        {place.whyRecommended && (
          <PlaceRecommendation whyRecommended={place.whyRecommended} />
        )}

        {/* Weather Forecast */}
        <WeatherForecast lat={place.lat} lon={place.long} />

        {/* Location Details */}
        <PlaceLocationDetails place={place} />
      </div>
    </motion.div>
  );
}
