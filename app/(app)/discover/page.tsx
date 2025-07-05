"use client";

import DiscoveryResult from "@/components/discovery/result/DiscoveryResult";
import { TripResultItem } from "@/types/result.types";
import { SearchFormModal } from "@/components/discovery/form/DiscoverFormModal";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { handleTripSearchBatch } from "../../../actions/discover.actions";
import { saveTripAction } from "../../../actions/place.actions";
import {
  getLatestSearchFromHistory,
  saveSearchToHistory,
} from "../../../actions/history.actions";
import { mapSearchToFormFilters } from "../../../actions/map-search-to-form.actions";
import type {
  SearchQuery,
  SearchResult,
  SearchHistoryRecord,
  FormValues,
} from "@/types/search-history.types";

// Use SearchResult as TripResult for consistency
type TripResult = SearchResult;

// Form schema definition
const formSchema = z
  .object({
    activity: z.string().min(1, { message: "Please select an activity." }),
    otherActivity: z.string().optional(),
    when: z.string().min(1, { message: "Please select when you want to go." }),
    customDate: z.date().optional(),
    specialCare: z
      .enum(["children", "lowMobility", "dogs"], {
        message: "Please select special care requirements.",
      })
      .optional(),
    distance: z.string().min(1, { message: "Please select a distance." }),
    transportType: z.enum(["foot", "bike", "transit", "car"], {
      message: "Please select a transport type.",
    }),
    activityLevel: z.number().min(1).max(5),
    activityDurationValue: z.coerce
      .number()
      .min(1, { message: "Activity duration must be at least 1." }),
    activityDurationUnit: z.enum(["hours", "days"], {
      message: "Please select an activity duration unit.",
    }),
    additionalInfo: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.activity === "other") {
        return data.otherActivity && data.otherActivity.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please describe your activity when 'Other' is selected.",
      path: ["otherActivity"],
    }
  )
  .refine(
    (data) => {
      if (data.when === "custom") {
        return data.customDate && data.customDate > new Date();
      }
      return true;
    },
    {
      message: "Please select a future date when 'Custom Date' is selected.",
      path: ["customDate"],
    }
  );

type FormSchemaType = FormValues;

export default function DiscoverPage() {
  const searchParams = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false); // Start closed to prevent flash
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tripResults, setTripResults] = useState<TripResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1); // No card selected by default
  const [selectedTrip, setSelectedTrip] = useState<TripResult | null>(null);
  const [hasInitialResults, setHasInitialResults] = useState<boolean>(false); // Track if we have any results yet
  const [isNewSearch, setIsNewSearch] = useState<boolean>(false); // Track if this is a new search or loaded from history
  const [isLoadingHistory, setIsLoadingHistory] = useState(true); // Track if we're loading search history
  const [isLoadingAIFilters, setIsLoadingAIFilters] = useState(false); // Track if we're loading AI-mapped filters
  const [hasProcessedQuery, setHasProcessedQuery] = useState(false); // Track if we've already processed the URL query
  const [hasPerformedSearch, setHasPerformedSearch] = useState(false); // Track if user has performed a search
  const [conversationHistory, setConversationHistory] = useState<any[]>([]); // Track AI conversation for context
  const [currentBatch, setCurrentBatch] = useState<number>(1); // Track current batch number
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(false); // Track if more results are available
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false); // Track if loading more results

  // Initialize form
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activity: "",
      otherActivity: "",
      when: "",
      customDate: undefined,
      specialCare: undefined,
      distance: "1 hour",
      transportType: "transit",
      activityLevel: 3,
      activityDurationValue: 4,
      activityDurationUnit: "hours",
      additionalInfo: "",
    },
  });

  // Get user location
  const getLocation = () => {
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success("Location acquired!");
        },
        (error) => {
          console.error("Error getting location: ", error);
          setLocationError(
            `Error: ${error.message}. Please ensure location services are enabled.`
          );
          toast.error("Failed to acquire location.");
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      toast.error("Geolocation not supported.");
    }
  };

  // Load latest search from history on component mount
  useEffect(() => {
    async function loadLatestSearch() {
      setIsLoadingHistory(true);
      try {
        // Check if we have URL parameters - if so, don't load history
        const query = searchParams.get("q");
        const shortcut = searchParams.get("shortcut");
        
        if (query || shortcut) {
          // User came from homepage with search params, start fresh
          getLocation();
          setIsSearchOpen(false); // Will be opened by the URL params effect
        } else {
          // Normal page load, try to load previous search
          const result = await getLatestSearchFromHistory();
          if (result.success && result.data) {
            const historyRecord = result.data as SearchHistoryRecord;
            const { query, results } = historyRecord;

            // Set form values from saved search
            form.reset({
              activity: query.activity || "",
              otherActivity: "",
              when: query.when || "today",
              customDate: undefined,
              specialCare: query.specialCare || undefined,
              distance: query.distance || "1 hour",
              transportType: "transit", // Default transport type since it's not saved
              activityLevel: query.activityLevel,
              activityDurationValue: query.activityDurationValue,
              activityDurationUnit: query.activityDurationUnit,
              additionalInfo: query.additionalInfo || "",
            });

            // Set location and results
            setUserLocation({
              latitude: query.location.latitude,
              longitude: query.location.longitude,
            });
            setTripResults(results);
            setHasInitialResults(true);
            setHasPerformedSearch(true); // Mark that we have previous search results

            // Don't open search modal if we have previous results
            setIsSearchOpen(false);
          } else {
            // No previous search, get location and show search modal
            getLocation();
            setIsSearchOpen(true);
          }
        }
      } catch (error) {
        console.error("Error loading latest search:", error);
        // Fallback to getting location and showing search modal
        getLocation();
        setIsSearchOpen(true);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadLatestSearch();
  }, [searchParams]);

  // Handle URL parameters for search query and shortcuts
  useEffect(() => {
    const query = searchParams.get("q");
    const shortcut = searchParams.get("shortcut");
    
    // Only process if we have a query/shortcut and haven't processed it yet
    if ((query || shortcut) && !hasProcessedQuery && !isLoadingHistory) {
      // Use AI to map search query or shortcut to form filters
      const processSearchQuery = async () => {
        setIsLoadingAIFilters(true);
        setHasProcessedQuery(true); // Mark as processed immediately to prevent duplicates
        
        try {
          const result = await mapSearchToFormFilters(
            query ? decodeURIComponent(query) : "",
            shortcut || undefined
          );
          
          if (result.success && result.data) {
            const mappedData = result.data;
            
            // Update form with AI-mapped values
            form.reset({
              activity: mappedData.activity || "",
              otherActivity: "",
              when: mappedData.when || "today",
              customDate: undefined,
              specialCare: mappedData.specialCare || undefined,
              distance: mappedData.distance || "1 hour",
              transportType: mappedData.transportType || "transit",
              activityLevel: mappedData.activityLevel || 3,
              activityDurationValue: mappedData.activityDurationValue || 4,
              activityDurationUnit: mappedData.activityDurationUnit || "hours",
              additionalInfo: mappedData.additionalInfo || (query ? decodeURIComponent(query) : ""),
            });
            
            toast.success("Search preferences pre-filled based on your query!");
          } else {
            // Fallback to original behavior
            if (query) {
              form.setValue("additionalInfo", decodeURIComponent(query));
            }
            toast.info("Complete the form to search for trips");
          }
        } catch (error) {
          console.error("Error mapping search query:", error);
          // Fallback to original behavior
          if (query) {
            form.setValue("additionalInfo", decodeURIComponent(query));
          }
          toast.info("Complete the form to search for trips");
        } finally {
          setIsLoadingAIFilters(false);
        }
      };
      
      processSearchQuery();
      
      // Open the search modal so user can review and complete the form
      setIsSearchOpen(true);
      // Get location if not already set
      if (!userLocation) {
        getLocation();
      }
    }
  }, [searchParams, hasProcessedQuery, isLoadingHistory]);

  // Form submission handler with progressive search
  function onSubmit(values: FormSchemaType) {
    if (!userLocation) {
      toast.error("Please allow location access to search for trips.");
      getLocation(); // Try to get location again
      return;
    }

    // Close modal immediately and clear results only when starting new search
    setIsSearchOpen(false);
    setIsLoading(true);
    setTripResults(null); // Clear previous results
    setHasInitialResults(false);
    setIsNewSearch(true);
    setHasPerformedSearch(true); // Mark that a search is being performed
    setConversationHistory([]); // Reset conversation history for new search
    setCurrentBatch(1); // Reset to first batch
    setHasMoreResults(false); // Reset more results flag

    startTransition(async () => {
      // Create payload for search (simplified - no encoding/decoding needed)
      const finalActivity =
        values.activity === "other"
          ? values.otherActivity || ""
          : values.activity;

      // Convert when value to proper format for AI
      let finalWhen = values.when;
      if (values.when === "custom" && values.customDate) {
        finalWhen = values.customDate.toISOString();
      }

      const payload: SearchQuery = {
        activity: finalActivity,
        when: finalWhen,
        specialCare: values.specialCare,
        distance: values.distance,
        activityLevel: values.activityLevel,
        activityDurationValue: values.activityDurationValue,
        activityDurationUnit: values.activityDurationUnit,
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        additionalInfo: values.additionalInfo,
      };

      try {
        // Convert payload to the format expected by discover actions
        const actionPayload = {
          activity: finalActivity,
          when: finalWhen,
          distance: values.distance,
          activityLevel: values.activityLevel,
          activityDurationValue: values.activityDurationValue,
          activityDurationUnit: values.activityDurationUnit,
          location: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
          specialCare: values.specialCare,
          additionalInfo: values.additionalInfo,
          transportType: values.transportType,
        };

        // Get first batch of results
        const batchResult = await handleTripSearchBatch(
          actionPayload,
          1,
          []
        );

        if (batchResult?.error) {
          toast.error(batchResult.error);
          setTripResults([]);
        } else if (batchResult?.data && batchResult.success) {
          const batchPlaces = Array.isArray(batchResult.data)
            ? batchResult.data
            : [];
          
          // Update UI with first batch results
          setTripResults(batchPlaces as TripResult[]);
          setHasInitialResults(true);
          setConversationHistory(batchResult.conversationHistory || []);
          setCurrentBatch(1);
          setHasMoreResults(batchResult.hasMore || false);
          
          if (batchPlaces.length > 0) {
            toast.success(
              `Found ${batchPlaces.length} great destinations!`
            );
            
            // Save search to history
            try {
              await saveSearchToHistory(payload, batchPlaces);
              console.log("Search saved to history successfully");
            } catch (error) {
              console.error("Failed to save search to history:", error);
              // Don't show error to user as this is not critical
            }
          } else {
            toast.info("No trips found matching your criteria.");
          }
        }
      } catch (error) {
        console.error("Error fetching trip results:", error);
        toast.error("Failed to fetch trip results. Please try again.");
        setTripResults([]);
      } finally {
        setIsLoading(false);
      }
    });
  }

  // Save trip handler
  const handleSaveTrip = async (trip: TripResult | TripResultItem) => {
    startSavingTransition(async () => {
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
      } else {
        toast.error(result.error || "Failed to save trip. Please try again.");
      }
    });
  };

  // Load more results handler
  const handleLoadMore = async () => {
    if (!userLocation || !tripResults || isLoadingMore || !hasMoreResults) {
      return;
    }

    setIsLoadingMore(true);
    
    try {
      const formValues = form.getValues();
      const finalActivity = formValues.activity === "other" ? formValues.otherActivity || "" : formValues.activity;
      let finalWhen = formValues.when;
      if (formValues.when === "custom" && formValues.customDate) {
        finalWhen = formValues.customDate.toISOString();
      }

      const actionPayload = {
        activity: finalActivity,
        when: finalWhen,
        distance: formValues.distance,
        activityLevel: formValues.activityLevel,
        activityDurationValue: formValues.activityDurationValue,
        activityDurationUnit: formValues.activityDurationUnit,
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        specialCare: formValues.specialCare,
        additionalInfo: formValues.additionalInfo,
        transportType: formValues.transportType,
      };

      const nextBatch = currentBatch + 1;
      const batchResult = await handleTripSearchBatch(
        actionPayload,
        nextBatch,
        conversationHistory
      );

      if (batchResult?.error) {
        toast.error(batchResult.error);
      } else if (batchResult?.data && batchResult.success) {
        const newPlaces = Array.isArray(batchResult.data) ? batchResult.data : [];
        
        if (newPlaces.length > 0) {
          // Append new results to existing ones
          setTripResults(prev => prev ? [...prev, ...newPlaces] : newPlaces);
          setConversationHistory(batchResult.conversationHistory || conversationHistory);
          setCurrentBatch(nextBatch);
          setHasMoreResults(batchResult.hasMore || false);
          
          toast.success(`Found ${newPlaces.length} more destinations!`);
        } else {
          setHasMoreResults(false);
          toast.info("No more destinations found.");
        }
      }
    } catch (error) {
      console.error("Error loading more results:", error);
      toast.error("Failed to load more results. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Show loading state while checking for search history
  if (isLoadingHistory) {
    return (
      <div className="h-screen flex ml-[60px]">
        <div className="w-full md:w-1/2 flex flex-col h-full px-6">
          <div className="flex-shrink-0 pt-6 pb-4 bg-background">
            <h1 className="text-3xl font-bold mb-2">Discover Nature Trips</h1>
            <p className="text-muted-foreground">
              Loading your previous search...
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                Checking for previous searches...
              </p>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/2 h-screen bg-muted">
          {/* Empty map area during loading */}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search Form Modal */}
      <SearchFormModal
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        form={form}
        onSubmit={onSubmit}
        isPending={isPending}
        locationError={locationError}
        onRetryLocation={getLocation}
        userLocation={userLocation}
        isLoadingAIFilters={isLoadingAIFilters}
      />

      {/* Use the new MapResult component */}
      <DiscoveryResult
        tripResults={tripResults as TripResultItem[] | null}
        title="Discover Nature Trips"
        subtitle="Find the perfect nature spot based on your preferences"
        userLocation={userLocation}
        isLoading={isLoading && (!tripResults || tripResults.length === 0)}
        onSearchClick={() => setIsSearchOpen(true)}
        emptyStateMessage={hasPerformedSearch ? "No trips found matching your criteria" : "Discover places around you"}
        onSaveTrip={handleSaveTrip}
        hasMoreResults={hasMoreResults}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        onNewSearch={() => {
          // Only open the modal, don't clear results until search is submitted
          setIsNewSearch(true);
          setIsSearchOpen(true);
        }}
        onCardClick={(index: number) => {
          // Track user interaction when manually clicking on cards
          setActiveCardIndex(index);
        }}
      />
    </>
  );
}
