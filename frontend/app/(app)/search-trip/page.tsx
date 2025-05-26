"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, ControllerRenderProps } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Loader2, Search } from "lucide-react";

const formSchema = z.object({
  tripCompanions: z.string().min(1, { message: "Please select who is going." }),
  distance: z.string().min(1, { message: "Please select a distance." }),
  activityLevel: z.number().min(1).max(5),
  durationValue: z.coerce
    .number()
    .min(1, { message: "Duration must be at least 1." }),
  durationUnit: z.enum(["hours", "days"], {
    message: "Please select a duration unit.",
  }),
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function SearchTripPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tripCompanions: "",
      distance: "30_min",
      activityLevel: 3,
      durationValue: 2,
      durationUnit: "hours",
    },
  });

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

  function onSubmit(values: FormSchemaType) {
    if (!userLocation) {
      toast.error("Please acquire your location first.");
      return;
    }

    startTransition(() => {
      // Prepare search parameters to pass to the results page
      const searchParams = new URLSearchParams();
      searchParams.set("companions", values.tripCompanions);
      searchParams.set("distance", values.distance);
      searchParams.set("activityLevel", values.activityLevel.toString());
      searchParams.set("durationValue", values.durationValue.toString());
      searchParams.set("durationUnit", values.durationUnit);
      searchParams.set("lat", userLocation.latitude.toString());
      searchParams.set("lng", userLocation.longitude.toString());

      // Navigate to results page with search parameters
      router.push(`/trip-results?${searchParams.toString()}`);
    });
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <h1 className="text-3xl font-bold mb-2">Plan Your Nature Trip</h1>
      <p className="text-muted-foreground mb-8">
        Tell us your preferences, and we'll find the perfect spots!
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* User Location */}
          <div className="space-y-2 p-4 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold">Your Current Location</h3>
            {!userLocation && (
              <Button
                type="button"
                onClick={getLocation}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Get My Location
              </Button>
            )}
            {userLocation && (
              <p className="text-sm text-green-600">
                Location acquired: Lat {userLocation.latitude.toFixed(4)}, Lon{" "}
                {userLocation.longitude.toFixed(4)}
              </p>
            )}
            {locationError && (
              <p className="text-sm text-destructive">{locationError}</p>
            )}
            <FormDescription>
              We need your location to find nearby nature spots.
            </FormDescription>
          </div>

          <FormField
            control={form.control}
            name="tripCompanions"
            render={({
              field,
            }: {
              field: ControllerRenderProps<FormSchemaType, "tripCompanions">;
            }) => (
              <FormItem>
                <FormLabel>Who is going?</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select companions" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="couple">Couple</SelectItem>
                    <SelectItem value="family_with_kids">
                      Family with Kids
                    </SelectItem>
                    <SelectItem value="friends_group">
                      Group of Friends
                    </SelectItem>
                    <SelectItem value="with_pets">With Pet(s)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="distance"
            render={({
              field,
            }: {
              field: ControllerRenderProps<FormSchemaType, "distance">;
            }) => (
              <FormItem>
                <FormLabel>Max Distance From You</FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="activityLevel"
            render={({
              field,
            }: {
              field: ControllerRenderProps<FormSchemaType, "activityLevel">;
            }) => (
              <FormItem>
                <FormLabel>Physical Activity Level (1=Low, 5=High)</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-4">
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
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="durationValue"
              render={({
                field,
              }: {
                field: ControllerRenderProps<FormSchemaType, "durationValue">;
              }) => (
                <FormItem>
                  <FormLabel>Desired Trip Duration</FormLabel>
                  <Input
                    type="number"
                    placeholder="e.g., 2"
                    {...field}
                    disabled={isPending}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="durationUnit"
              render={({
                field,
              }: {
                field: ControllerRenderProps<FormSchemaType, "durationUnit">;
              }) => (
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
            className="w-full sm:w-auto"
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
    </div>
  );
}
