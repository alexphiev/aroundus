"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Smile,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import TripMap from "@/components/map/TripMap";
import { handleTripSearch } from "../search-trip/actions";
import { saveTripAction, TripToSave } from "../search-trip/saveTripActions";

// Define the structure of a trip result
interface TripResult {
  name: string;
  description: string;
  lat: number;
  long: number;
}

export default function TripResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [tripResults, setTripResults] = useState<TripResult[] | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch results on component mount
  useEffect(() => {
    const fetchResults = async () => {
      if (!searchParams) return;

      // Extract search parameters
      const companions = searchParams.get("companions");
      const distanceValue = searchParams.get("distanceValue");
      const distanceUnit = searchParams.get("distanceUnit");
      const activityLevel = searchParams.get("activityLevel");
      const durationValue = searchParams.get("durationValue");
      const durationUnit = searchParams.get("durationUnit");
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");

      // Validate required parameters
      if (
        !companions ||
        !distanceValue ||
        !distanceUnit ||
        !activityLevel ||
        !durationValue ||
        !durationUnit ||
        !lat ||
        !lng
      ) {
        toast.error("Missing required search parameters.");
        router.push("/search-trip");
        return;
      }

      // Set user location
      setUserLocation({
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      });

      // Create payload for search
      const payload = {
        tripCompanions: companions,
        distanceValue: parseInt(distanceValue),
        distanceUnit: distanceUnit as "minutes" | "hours",
        activityLevel: parseInt(activityLevel),
        durationValue: parseInt(durationValue),
        durationUnit: durationUnit as "hours" | "days",
        location: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        },
      };

      try {
        // Execute search
        setIsLoading(true);
        const result = await handleTripSearch(payload);

        if (result?.error) {
          toast.error(result.error);
          setTripResults([]);
        } else if (result?.data) {
          const dataArray = Array.isArray(result.data) ? result.data : [];
          if (dataArray.length > 0) {
            toast.success(`Found ${dataArray.length} trip(s)!`);
          } else {
            toast.info("No trips found matching your criteria.");
          }
          setTripResults(dataArray as TripResult[]);
        } else {
          toast.warning("No specific data or error returned from search.");
          setTripResults([]);
        }
      } catch (error) {
        console.error("Error fetching trip results:", error);
        toast.error("Failed to fetch trip results. Please try again.");
        setTripResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchParams, router]);

  const handleSaveTrip = async (trip: TripResult) => {
    startSavingTransition(async () => {
      toast.info(`Saving "${trip.name}"...`);
      const tripToSave: TripToSave = {
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

  // Function to scroll to a specific card in the carousel
  const scrollToCard = (index: number) => {
    if (carouselRef.current && tripResults && tripResults.length > 0) {
      const cardWidth = carouselRef.current.offsetWidth;
      carouselRef.current.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      });
      setActiveCardIndex(index);
    }
  };

  // Handle carousel navigation
  const handlePrevCard = () => {
    if (activeCardIndex > 0) {
      scrollToCard(activeCardIndex - 1);
    }
  };

  const handleNextCard = () => {
    if (tripResults && activeCardIndex < tripResults.length - 1) {
      scrollToCard(activeCardIndex + 1);
    }
  };

  // Update active card index based on scroll position
  const handleCarouselScroll = () => {
    if (carouselRef.current && tripResults && tripResults.length > 0) {
      const scrollPosition = carouselRef.current.scrollLeft;
      const cardWidth = carouselRef.current.offsetWidth;
      const index = Math.round(scrollPosition / cardWidth);

      if (index !== activeCardIndex) {
        setActiveCardIndex(index);
      }
    }
  };

  // Add scroll event listener to carousel
  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener("scroll", handleCarouselScroll);
      return () => {
        carousel.removeEventListener("scroll", handleCarouselScroll);
      };
    }
  }, [tripResults, activeCardIndex]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => router.push("/search-trip")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
      </Button>
      <h1 className="text-3xl font-bold mb-2">Your Nature Trip Results</h1>

      {/* Loading Animation */}
      {isLoading && (
        <div className="mt-10 text-center py-10">
          <div className="relative w-64 h-64 mx-auto">
            <Image
              src="/images/mountain-loading.svg"
              alt="Loading mountain scenery"
              fill
              className="object-contain"
            />
          </div>
          <p className="mt-4 text-lg text-muted-foreground">
            Discovering perfect nature spots for you...
          </p>
        </div>
      )}

      {/* No Results */}
      {!isLoading && tripResults?.length === 0 && (
        <div className="mt-10 text-center py-10 border rounded-lg bg-muted">
          <Smile className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">No Trips Found</h3>
          <p className="mt-2 text-muted-foreground">
            We couldn't find any trips matching your criteria. Try adjusting
            your search!
          </p>
          <Button className="mt-6" onClick={() => router.push("/search-trip")}>
            Try Again
          </Button>
        </div>
      )}

      {/* Results Found */}
      {!isLoading && tripResults && tripResults.length > 0 && (
        <div className="mt-10 space-y-8">
          {/* Map Section */}
          <div className="w-full">
            <h2 className="text-2xl font-bold mb-4">Trip Suggestions Map</h2>
            <div className="w-full h-[400px] rounded-lg overflow-hidden">
              <TripMap
                tripResults={tripResults}
                userLocation={userLocation}
                activeMarkerIndex={activeCardIndex}
              />
            </div>
          </div>

          {/* Card Carousel Section */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                Suggested Trips ({activeCardIndex + 1} of {tripResults.length})
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevCard}
                  disabled={activeCardIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextCard}
                  disabled={activeCardIndex === tripResults.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Carousel Container */}
            <div className="relative overflow-hidden">
              {/* Progress Indicator */}
              <div className="flex gap-1 justify-center mb-4">
                {tripResults.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === activeCardIndex
                        ? "w-8 bg-primary"
                        : "w-2 bg-muted-foreground/30"
                    }`}
                    onClick={() => scrollToCard(index)}
                    role="button"
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              <div
                ref={carouselRef}
                className="overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  scrollSnapType: "x mandatory",
                }}
              >
                <div className="flex">
                  {tripResults.map((trip, index) => (
                    <div key={index} className="min-w-full snap-center px-4">
                      <Card className="overflow-hidden shadow-lg mx-auto max-w-xl">
                        <CardHeader>
                          <CardTitle>{trip.name}</CardTitle>
                          <CardDescription>{trip.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>
                              GPS: {trip.lat.toFixed(4)}, {trip.long.toFixed(4)}
                            </span>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveTrip(trip)}
                            disabled={isSaving}
                            className="w-full"
                          >
                            {isSaving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Bookmark className="mr-2 h-4 w-4" />
                            )}
                            Save Trip
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
