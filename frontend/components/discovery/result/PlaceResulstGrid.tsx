"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TripResultItem } from "@/types/result.types";
import TripResultCard from "./PlaceCard";
import SkeletonCard from "./SkeletonCard";
import ProgressiveSearchIndicator from "./ProgressiveSearchIndicator";

interface Props {
  tripResults: TripResultItem[];
  activeCardIndex: number;
  savedTripNames: Set<string>;
  showSaveButton: boolean;
  isSaving: boolean;
  isProgressiveComplete: boolean;
  progressiveStage?: string;
  onCardClick: (index: number, trip: TripResultItem) => void;
  onSaveTrip: (trip: TripResultItem) => void;
}

export default function PlaceResultsGrid({
  tripResults,
  activeCardIndex,
  savedTripNames,
  showSaveButton,
  isSaving,
  isProgressiveComplete,
  progressiveStage,
  onCardClick,
  onSaveTrip,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!isProgressiveComplete && progressiveStage && (
          <ProgressiveSearchIndicator stage={progressiveStage} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence>
          {tripResults.map((trip, index) => (
            <TripResultCard
              key={trip.id || index}
              trip={trip}
              index={index}
              isActive={activeCardIndex === index}
              isSaved={savedTripNames.has(trip.name)}
              showSaveButton={showSaveButton}
              isSaving={isSaving}
              onClick={() => onCardClick(index, trip)}
              onSave={(e) => {
                e.stopPropagation();
                onSaveTrip(trip);
              }}
            />
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
  );
}
