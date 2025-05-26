"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Search,
  Filter,
  Mountain,
  TreePine,
  Waves,
  Bike,
  Tent,
  Camera,
  Footprints,
  Bird,
  Compass,
  X,
  Bookmark,
  User,
  Users,
  Heart,
  Baby,
  Dog,
  Activity,
  Dumbbell,
  LocateFixed,
  Flame,
  Snowflake,
  Car,
  Train,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TripMap from "@/components/map/TripMap";
import { handleTripSearch } from "../search-trip/actions";
import { saveTripAction } from "../search-trip/saveTripActions";
import Image from "next/image";
import { cn } from "@/lib/utils";
import MapResult, { TripResultItem } from "@/components/map/MapResult";

// Enhanced trip result interface with landscape and activity types
interface TripResult {
  name: string;
  description: string;
  lat: number;
  long: number;
  landscape:
    | "mountain"
    | "forest"
    | "lake"
    | "beach"
    | "river"
    | "park"
    | "wetland"
    | "desert";
  activity:
    | "hiking"
    | "biking"
    | "camping"
    | "photography"
    | "wildlife"
    | "walking"
    | "swimming";
}

// Form schema definition
const formSchema = z.object({
  tripCompanions: z.string().min(1, { message: "Please select who is going." }),
  distance: z.string().min(1, { message: "Please select a distance." }),
  transportType: z.enum(["foot", "bike", "transit", "car"], {
    message: "Please select a transport type.",
  }),
  activityLevel: z.number().min(1).max(5),
  durationValue: z.coerce
    .number()
    .min(1, { message: "Duration must be at least 1." }),
  durationUnit: z.enum(["hours", "days"], {
    message: "Please select a duration unit.",
  }),
});

type FormSchemaType = z.infer<typeof formSchema>;

// Define the CompanionOption component before it's used
interface CompanionOptionProps {
  value: string;
  current: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  label: string;
}

function CompanionOption({
  value,
  current,
  onChange,
  icon,
  label,
}: CompanionOptionProps) {
  const isSelected = current === value;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border transition-all",
              isSelected
                ? "bg-primary/10 border-primary text-primary"
                : "bg-card hover:bg-muted border-muted-foreground/20"
            )}
            onClick={() => onChange(value)}
          >
            <div className="mb-1">{icon}</div>
            <span className="text-xs font-medium">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Define the TransportOption component
interface TransportOptionProps {
  value: string;
  current: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  label: string;
}

function TransportOption({
  value,
  current,
  onChange,
  icon,
  label,
}: TransportOptionProps) {
  const isSelected = current === value;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "p-2 rounded-full transition-all",
              isSelected
                ? "bg-primary/10 text-primary ring-2 ring-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            onClick={() => onChange(value)}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function DiscoverPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tripResults, setTripResults] = useState<TripResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [selectedTrip, setSelectedTrip] = useState<TripResult | null>(null);

  // Initialize form
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tripCompanions: "",
      distance: "1_hour",
      transportType: "transit",
      activityLevel: 3,
      durationValue: 4,
      durationUnit: "hours",
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

  // Use effect to get location on component mount
  useEffect(() => {
    getLocation();
  }, []);

  // Form submission handler
  function onSubmit(values: FormSchemaType) {
    if (!userLocation) {
      toast.error("Please allow location access to search for trips.");
      getLocation(); // Try to get location again
      return;
    }

    startTransition(async () => {
      setIsLoading(true);
      setIsSearchOpen(false); // Close the search modal

      // Convert distance string to value and unit
      let distanceValue = 30;
      let distanceUnit: "minutes" | "hours" = "minutes";

      if (values.distance === "10_min") {
        distanceValue = 10;
        distanceUnit = "minutes";
      } else if (values.distance === "30_min") {
        distanceValue = 30;
        distanceUnit = "minutes";
      } else if (values.distance === "45_min") {
        distanceValue = 45;
        distanceUnit = "minutes";
      } else if (values.distance === "1_hour") {
        distanceValue = 1;
        distanceUnit = "hours";
      } else if (values.distance === "2_hours") {
        distanceValue = 2;
        distanceUnit = "hours";
      } else if (values.distance === "3_hours") {
        distanceValue = 3;
        distanceUnit = "hours";
      } else if (values.distance === "5_hours") {
        distanceValue = 5;
        distanceUnit = "hours";
      }

      // Create payload for search
      const payload = {
        tripCompanions: values.tripCompanions,
        distanceValue: distanceValue,
        distanceUnit: distanceUnit,
        transportType: values.transportType,
        activityLevel: values.activityLevel,
        durationValue: values.durationValue,
        durationUnit: values.durationUnit,
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
      };

      try {
        const result = await handleTripSearch(payload);

        if (result?.error) {
          toast.error(result.error);
          setTripResults([]);
        } else if (result?.data) {
          const dataArray = Array.isArray(result.data) ? result.data : [];

          // Enhance the data with landscape and activity types
          const enhancedData = dataArray.map((trip) => {
            // Assign random landscape and activity types for now
            // In real implementation, this would come from the AI
            const landscapes = [
              "mountain",
              "forest",
              "lake",
              "beach",
              "river",
              "park",
              "wetland",
              "desert",
            ];
            const activities = [
              "hiking",
              "biking",
              "camping",
              "photography",
              "wildlife",
              "walking",
              "swimming",
            ];

            return {
              ...trip,
              landscape: landscapes[
                Math.floor(Math.random() * landscapes.length)
              ] as TripResult["landscape"],
              activity: activities[
                Math.floor(Math.random() * activities.length)
              ] as TripResult["activity"],
            };
          });

          if (enhancedData.length > 0) {
            toast.success(`Found ${enhancedData.length} trip(s)!`);
          } else {
            toast.info("No trips found matching your criteria.");
          }
          setTripResults(enhancedData as TripResult[]);
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

  // Get landscape icon
  const getLandscapeIcon = (landscape: TripResult["landscape"]) => {
    switch (landscape) {
      case "mountain":
        return <Mountain className="h-5 w-5" />;
      case "forest":
        return <TreePine className="h-5 w-5" />;
      case "beach":
      case "lake":
      case "river":
        return <Waves className="h-5 w-5" />;
      default:
        return <Mountain className="h-5 w-5" />;
    }
  };

  // Get activity icon
  const getActivityIcon = (activity: TripResult["activity"]) => {
    switch (activity) {
      case "hiking":
        return <Footprints className="h-5 w-5" />;
      case "biking":
        return <Bike className="h-5 w-5" />;
      case "camping":
        return <Tent className="h-5 w-5" />;
      case "photography":
        return <Camera className="h-5 w-5" />;
      case "wildlife":
        return <Bird className="h-5 w-5" />;
      case "walking":
        return <Footprints className="h-5 w-5" />;
      case "swimming":
        return <Waves className="h-5 w-5" />;
      default:
        return <Compass className="h-5 w-5" />;
    }
  };

  // Get activity level icon based on the selected level
  const getActivityLevelIcon = (level: number) => {
    switch (level) {
      case 1:
        return <Snowflake className="h-5 w-5" />; // Very easy
      case 2:
        return <Footprints className="h-5 w-5" />; // Easy
      case 3:
        return <Activity className="h-5 w-5" />; // Medium
      case 4:
        return <Dumbbell className="h-5 w-5" />; // Hard
      case 5:
        return <Flame className="h-5 w-5" />; // Very hard
      default:
        return <Activity className="h-5 w-5" />; // Default
    }
  };

  return (
    <>
      {/* Search Form Modal */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
            size="lg"
          >
            <Filter className="mr-2 h-5 w-5" />
            Search Trips
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan Your Nature Trip</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Location error message - only show if there's a problem */}
              {locationError && (
                <div className="p-3 border border-destructive/50 rounded-lg bg-destructive/10">
                  <p className="text-sm text-destructive">{locationError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getLocation}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {/* Trip Companions - Icon Version */}
              <FormField
                control={form.control}
                name="tripCompanions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Who is going?</FormLabel>
                    <div className="grid grid-cols-5 gap-2">
                      <CompanionOption
                        value="solo"
                        current={field.value}
                        onChange={field.onChange}
                        icon={<User className="h-6 w-6" />}
                        label="Solo"
                      />
                      <CompanionOption
                        value="couple"
                        current={field.value}
                        onChange={field.onChange}
                        icon={<Heart className="h-6 w-6" />}
                        label="Couple"
                      />
                      <CompanionOption
                        value="family_with_kids"
                        current={field.value}
                        onChange={field.onChange}
                        icon={<Baby className="h-6 w-6" />}
                        label="Family"
                      />
                      <CompanionOption
                        value="friends_group"
                        current={field.value}
                        onChange={field.onChange}
                        icon={<Users className="h-6 w-6" />}
                        label="Friends"
                      />
                      <CompanionOption
                        value="with_pets"
                        current={field.value}
                        onChange={field.onChange}
                        icon={<Dog className="h-6 w-6" />}
                        label="With Pets"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Distance */}
              <FormField
                control={form.control}
                name="distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Distance From You</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select distance" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="10_min">10 minutes</SelectItem>
                            <SelectItem value="30_min">30 minutes</SelectItem>
                            <SelectItem value="45_min">45 minutes</SelectItem>
                            <SelectItem value="1_hour">1 hour</SelectItem>
                            <SelectItem value="2_hours">2 hours</SelectItem>
                            <SelectItem value="3_hours">3 hours</SelectItem>
                            <SelectItem value="5_hours">5 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <FormField
                        control={form.control}
                        name="transportType"
                        render={({ field }) => (
                          <div className="flex items-center gap-2 justify-around p-2">
                            <TransportOption
                              value="foot"
                              current={field.value}
                              onChange={field.onChange}
                              icon={<Footprints className="h-5 w-5" />}
                              label="On foot"
                            />

                            <TransportOption
                              value="bike"
                              current={field.value}
                              onChange={field.onChange}
                              icon={<Bike className="h-5 w-5" />}
                              label="By bike"
                            />

                            <TransportOption
                              value="transit"
                              current={field.value}
                              onChange={field.onChange}
                              icon={<Train className="h-5 w-5" />}
                              label="By transit"
                            />

                            <TransportOption
                              value="car"
                              current={field.value}
                              onChange={field.onChange}
                              icon={<Car className="h-5 w-5" />}
                              label="By car"
                            />
                          </div>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Activity Level */}
              <FormField
                control={form.control}
                name="activityLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Activity Level</FormLabel>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          {getActivityLevelIcon(field.value)}
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-4 flex-1">
                            <Slider
                              min={1}
                              max={5}
                              step={1}
                              defaultValue={[field.value]}
                              onValueChange={(value: number[]) =>
                                field.onChange(value[0])
                              }
                              disabled={isPending}
                              className="flex-1"
                            />
                            <span className="font-medium w-8 text-center">
                              {field.value}
                            </span>
                          </div>
                        </FormControl>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="durationValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Duration</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(parseInt(value))
                        }
                        defaultValue={field.value.toString()}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="durationUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isPending || !userLocation}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Find Trips
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Use the new MapResult component */}
      <MapResult
        tripResults={tripResults as TripResultItem[] | null}
        title="Discover Nature Trips"
        subtitle="Find the perfect nature spot based on your preferences"
        userLocation={userLocation}
        isLoading={isLoading}
        onSearchClick={() => setIsSearchOpen(true)}
        emptyStateMessage="No trips found matching your criteria"
        onSaveTrip={handleSaveTrip}
      />

      {/* Trip Details Modal */}
      {selectedTrip && (
        <Dialog
          open={!!selectedTrip}
          onOpenChange={(open) => !open && setSelectedTrip(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <div className="absolute right-4 top-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedTrip(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <DialogHeader className="pt-6">
              <div className="flex gap-2 mb-2">
                <div className="bg-primary/10 p-1 rounded-full">
                  {selectedTrip && getLandscapeIcon(selectedTrip.landscape)}
                </div>
                <div className="bg-primary/10 p-1 rounded-full">
                  {selectedTrip && getActivityIcon(selectedTrip.activity)}
                </div>
              </div>
              <DialogTitle>{selectedTrip.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p>{selectedTrip.description}</p>

              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>
                  GPS: {selectedTrip.lat.toFixed(6)},{" "}
                  {selectedTrip.long.toFixed(6)}
                </span>
              </div>

              <div className="h-64 rounded-lg overflow-hidden">
                <TripMap
                  tripResults={[selectedTrip]}
                  userLocation={userLocation}
                  activeMarkerIndex={0}
                  className="h-full"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => handleSaveTrip(selectedTrip)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Bookmark className="mr-2 h-4 w-4" />
                )}
                Save Trip
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
