"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TripResultItem } from "@/types/result.types";
import TripResultCard from "./PlaceCard";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";

interface Props {
  tripResults: TripResultItem[];
  activeCardIndex: number;
  savedTripNames: Set<string>;
  showSaveButton: boolean;
  isSaving: boolean;
  hasMoreResults: boolean;
  isLoadingMore: boolean;
  onLoadMore?: () => void;
  onCardClick: (index: number, trip: TripResultItem) => void;
  onSaveTrip: (trip: TripResultItem) => void;
}

export default function PlaceResultsGrid({
  tripResults,
  activeCardIndex,
  savedTripNames,
  showSaveButton,
  isSaving,
  hasMoreResults,
  isLoadingMore,
  onLoadMore,
  onCardClick,
  onSaveTrip,
}: Props) {
  return (
    <div className="space-y-6">
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
        </AnimatePresence>
      </div>

      {/* Load More Button */}
      {hasMoreResults && onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            size="lg"
            className="min-w-32"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Load More
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
