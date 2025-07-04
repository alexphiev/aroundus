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
import { handleProgressiveTripSearchByStage } from "../../../actions/discover.actions";
import { saveTripAction } from "../../../actions/place.actions";
import {
  getLatestSearchFromHistory,
  saveSearchToHistory,
} from "../../../actions/history.actions";
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
  const [searchStage, setSearchStage] = useState<string>(""); // Track current search stage
  const [hasInitialResults, setHasInitialResults] = useState<boolean>(false); // Track if we have any results yet
  const [isNewSearch, setIsNewSearch] = useState<boolean>(false); // Track if this is a new search or loaded from history
  const [isLoadingHistory, setIsLoadingHistory] = useState(true); // Track if we're loading search history

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

          // Don't open search modal if we have previous results
          setIsSearchOpen(false);
        } else {
          // No previous search, get location and show search modal
          getLocation();
          setIsSearchOpen(true);
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
  }, []);

  // Handle URL parameters for search query
  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      // Set the additional info field with the search query
      form.setValue("additionalInfo", decodeURIComponent(query));
      // Open the search modal so user can complete the form
      setIsSearchOpen(true);
      // Get location if not already set
      if (!userLocation) {
        getLocation();
      }
    }
  }, [searchParams, form, userLocation]);

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
    setSearchStage("");
    setHasInitialResults(false);
    setIsNewSearch(true);

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

      let allResults: TripResult[] = [];
      let conversationHistory: any[] = [];

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

        // Stage 1: 3-star destinations
        setSearchStage("iconic");
        const threeStarResult = await handleProgressiveTripSearchByStage(
          actionPayload,
          "3-star",
          conversationHistory
        );

        if (threeStarResult?.error) {
          toast.error(threeStarResult.error);
        } else if (threeStarResult?.data && threeStarResult.success) {
          const threeStarPlaces = Array.isArray(threeStarResult.data)
            ? threeStarResult.data
            : [];
          allResults = [...allResults, ...threeStarPlaces];
          conversationHistory = threeStarResult.conversationHistory || [];

          // Update UI with 3-star results immediately
          setTripResults([...allResults] as TripResult[]);
          setHasInitialResults(true); // We now have initial results to show
          if (threeStarPlaces.length > 0) {
            toast.success(
              `Found ${threeStarPlaces.length} iconic destinations!`
            );
          }
        }

        // Stage 2: 2-star destinations
        setSearchStage("local");
        const twoStarResult = await handleProgressiveTripSearchByStage(
          actionPayload,
          "2-star",
          conversationHistory
        );

        if (twoStarResult?.error) {
          toast.error(twoStarResult.error);
        } else if (twoStarResult?.data && twoStarResult.success) {
          const twoStarPlaces = Array.isArray(twoStarResult.data)
            ? twoStarResult.data
            : [];
          allResults = [...allResults, ...twoStarPlaces];
          conversationHistory = twoStarResult.conversationHistory || [];

          // Update UI with 2-star results immediately
          setTripResults([...allResults] as TripResult[]);
          if (twoStarPlaces.length > 0) {
            toast.success(
              `Found ${twoStarPlaces.length} additional great spots!`
            );
          }
        }

        // Stage 3: 1-star destinations
        setSearchStage("hidden gems");
        const oneStarResult = await handleProgressiveTripSearchByStage(
          actionPayload,
          "1-star",
          conversationHistory
        );

        if (oneStarResult?.error) {
          toast.error(oneStarResult.error);
        } else if (oneStarResult?.data && oneStarResult.success) {
          const oneStarPlaces = Array.isArray(oneStarResult.data)
            ? oneStarResult.data
            : [];
          allResults = [...allResults, ...oneStarPlaces];

          // Final update with all results
          setTripResults([...allResults] as TripResult[]);
          if (oneStarPlaces.length > 0) {
            toast.success(`Found ${oneStarPlaces.length} hidden gems!`);
          }
        }

        // Final summary and save to history
        if (allResults.length > 0) {
          toast.success(
            `Search complete! Found ${allResults.length} total destinations.`
          );

          // Save search to history
          try {
            await saveSearchToHistory(payload, allResults);
            console.log("Search saved to history successfully");
          } catch (error) {
            console.error("Failed to save search to history:", error);
            // Don't show error to user as this is not critical
          }
        } else {
          toast.info("No trips found matching your criteria.");
        }
      } catch (error) {
        console.error("Error fetching trip results:", error);
        toast.error("Failed to fetch trip results. Please try again.");
        setTripResults([]);
      } finally {
        setIsLoading(false);
        setSearchStage("");
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
      };
      const result = await saveTripAction(tripToSave);
      if (result.success) {
        toast.success(`"${trip.name}" saved successfully!`);
      } else {
        toast.error(result.error || "Failed to save trip. Please try again.");
      }
    });
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
      />

      {/* Use the new MapResult component */}
      <DiscoveryResult
        tripResults={tripResults as TripResultItem[] | null}
        title="Discover Nature Trips"
        subtitle="Find the perfect nature spot based on your preferences"
        userLocation={userLocation}
        isLoading={isLoading && (!tripResults || tripResults.length === 0)}
        onSearchClick={() => setIsSearchOpen(true)}
        emptyStateMessage="No trips found matching your criteria"
        onSaveTrip={handleSaveTrip}
        progressiveStage={searchStage}
        isProgressiveComplete={!isLoading}
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
