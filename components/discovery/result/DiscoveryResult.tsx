"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import TripMap from "@/components/discovery/result/Map";
import PlaceDetailView from "@/components/discovery/result/PlaceDetailView";
import LoadingState from "@/components/discovery/result/LoadingState";
import EmptyState from "@/components/discovery/result/EmptyState";
import ResultsHeader from "@/components/discovery/result/ResultsHeader";
import PlaceResultsGrid from "@/components/discovery/result/PlaceResulstGrid";
import { saveTripAction, getSavedTripsAction } from "@/actions/place.actions";
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
  hasMoreResults?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
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
  hasMoreResults = false,
  isLoadingMore = false,
  onLoadMore,
  onNewSearch,
  onCardClick,
}: Props) {
  const router = useRouter();
  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedTripNames, setSavedTripNames] = useState<Set<string>>(new Set());
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
    setActiveCardIndex(-1);
    if (onCardClick) {
      onCardClick(-1);
    }
  };

  // Handle card clicks to open detail view
  const handleCardClick = (index: number, place: TripResultItem) => {
    console.log("handleCardClick called with index:", index, "place:", place.name);
    
    // Always set state - let React handle optimization
    setActiveCardIndex(index);
    setSelectedPlace(place);
    
    // Always call onCardClick to ensure map updates
    if (onCardClick) {
      onCardClick(index);
    }
    
    // Add to browser history for back button support
    window.history.pushState({ detailView: true, index, placeName: place.name }, "", window.location.href);
  };

  // Handle back to cards view (from UI button)
  const handleBackToCards = () => {
    console.log("handleBackToCards called");
    
    setSelectedPlace(null);
    setActiveCardIndex(-1);
    if (onCardClick) {
      onCardClick(-1);
    }
    
    // Replace current history entry instead of going back
    // This removes the detail view entry without triggering popstate
    window.history.replaceState(null, "", window.location.href);
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

  // Handle browser back button
  useEffect(() => {
    const handlePopstate = () => {
      console.log("popstate event triggered, selectedPlace:", selectedPlace?.name);
      
      // Only handle if we're in detail view and this is a real back navigation
      if (selectedPlace) {
        console.log("Closing detail view due to browser back");
        setSelectedPlace(null);
        setActiveCardIndex(-1);
        if (onCardClick) {
          onCardClick(-1);
        }
      }
    };

    window.addEventListener("popstate", handlePopstate);

    return () => {
      window.removeEventListener("popstate", handlePopstate);
    };
  }, [selectedPlace, onCardClick]);

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
        landscape: trip.landscape,
        activity: trip.activity,
        estimatedActivityDuration: trip.estimatedActivityDuration,
        estimatedTransportTime: trip.estimatedTransportTime,
        whyRecommended: trip.whyRecommended,
        starRating: trip.starRating,
        bestTimeToVisit: trip.bestTimeToVisit,
        timeToAvoid: trip.timeToAvoid,
        googleMapsLink: (trip as any).googleMapsLink,
        operatingHours: (trip as any).operatingHours,
        entranceFee: (trip as any).entranceFee,
        parkingInfo: (trip as any).parkingInfo,
        currentConditions: (trip as any).currentConditions,
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
              <ResultsHeader
                title={title}
                subtitle={subtitle}
                onNewSearch={onNewSearch}
              />

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto py-4 pb-8 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {/* Loading State */}
                {isLoading && <LoadingState />}

                {/* No Results */}
                {!isLoading && (!tripResults || tripResults.length === 0) && (
                  <EmptyState
                    message={emptyStateMessage}
                    onSearchClick={onSearchClick}
                  />
                )}

                {/* Trip Results Grid */}
                {!isLoading && tripResults && tripResults.length > 0 && (
                  <PlaceResultsGrid
                    tripResults={tripResults}
                    activeCardIndex={activeCardIndex}
                    savedTripNames={savedTripNames}
                    showSaveButton={showSaveButton}
                    isSaving={isSaving}
                    hasMoreResults={hasMoreResults}
                    isLoadingMore={isLoadingMore}
                    onLoadMore={onLoadMore}
                    onCardClick={handleCardClick}
                    onSaveTrip={handleSaveTrip}
                  />
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
          }
          userLocation={userLocation}
          activeMarkerIndex={activeCardIndex}
          className="h-full"
          shouldUpdateBounds={true}
          isProgressiveSearch={isLoadingMore}
          onMarkerClick={handleMarkerClick}
          onPopupClose={handlePopupClose}
        />
      </div>
    </div>
  );
}
