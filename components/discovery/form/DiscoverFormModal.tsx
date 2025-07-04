"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Activity,
  Baby,
  Bike,
  Car,
  Dog,
  Dumbbell,
  Flame,
  Footprints,
  Loader2,
  Search,
  Snowflake,
  Train,
  Accessibility,
  Mountain,
  Waves,
  Heart,
  Plus,
  Camera,
  CalendarIcon,
} from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { FormValues } from "@/types/search-history.types";
import {
  ACTIVITY_OPTIONS,
  WHEN_OPTIONS,
  DISTANCE_OPTIONS,
  TRANSPORT_OPTIONS,
  ACTIVITY_DURATION_VALUES,
  ACTIVITY_DURATION_UNITS,
  SPECIAL_CARE_OPTIONS,
} from "@/constants/discover.constants";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

type FormSchemaType = FormValues;

// Reusable SelectionGrid component for grid-based selections
interface SelectionGridProps {
  options: Array<{
    value: string;
    icon: React.ReactNode;
    label: string;
  }>;
  value?: string;
  onChange: (value?: string) => void;
  columns?: number;
}

function SelectionGrid({
  options,
  value,
  onChange,
  columns = 3,
}: SelectionGridProps) {
  // Calculate grid layout based on number of options with max 6 per row
  const maxCols = Math.min(6, options.length);
  const gridColsClass = maxCols === 1 ? "grid-cols-1" : 
                       maxCols === 2 ? "grid-cols-2" : 
                       maxCols === 3 ? "grid-cols-3" : 
                       maxCols === 4 ? "grid-cols-4" : 
                       maxCols === 5 ? "grid-cols-5" : 
                       "grid-cols-6";
  
  return (
    <div className={cn(
      "grid gap-3", 
      gridColsClass,
      options.length <= 3 && "max-w-md"
    )}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all h-20 min-w-0",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-muted-foreground/20 bg-background hover:border-primary/50 hover:bg-primary/5"
            )}
            onClick={() => onChange(isSelected ? undefined : option.value)}
          >
            <div className="mb-1.5 flex-shrink-0">{option.icon}</div>
            <span className="text-xs font-medium text-center leading-tight">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
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

// Search Form Modal Props
interface SearchFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<FormSchemaType>;
  onSubmit: (values: FormSchemaType) => void;
  isPending: boolean;
  locationError: string | null;
  onRetryLocation: () => void;
  userLocation: { latitude: number; longitude: number } | null;
}

export function SearchFormModal({
  isOpen,
  onOpenChange,
  form,
  onSubmit,
  isPending,
  locationError,
  onRetryLocation,
  userLocation,
}: SearchFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Plan Your Nature Trip</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="space-y-8 overflow-y-auto flex-1 px-4 -mx-4 py-2 pr-6">
              {/* Location error message - only show if there's a problem */}
              {locationError && (
                <div className="p-3 border border-destructive/50 rounded-lg bg-destructive/10">
                  <p className="text-sm text-destructive">{locationError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onRetryLocation}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {/* Activity Selection - First Priority */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="activity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What would you like to do?</FormLabel>
                      <SelectionGrid
                        options={ACTIVITY_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                        columns={6}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("activity") === "other" && (
                  <FormField
                    control={form.control}
                    name="otherActivity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Describe your activity</FormLabel>
                        <Input
                          placeholder="e.g., bird watching, sketching, rock climbing..."
                          {...field}
                          disabled={isPending}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

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

              {/* Activity Duration */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="activityDurationValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Duration</FormLabel>
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
                          {ACTIVITY_DURATION_VALUES.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activityDurationUnit"
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
                          {ACTIVITY_DURATION_UNITS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* When Selection */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="when"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When would you like to go?</FormLabel>
                      <SelectionGrid
                        options={WHEN_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                        columns={4}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("when") === "custom" && (
                  <FormField
                    control={form.control}
                    name="customDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select custom date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isPending}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date() ||
                                date < new Date("1900-01-01")
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Distance */}
              <FormField
                control={form.control}
                name="distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Distance From You</FormLabel>
                    <div className="grid grid-cols-2 gap-4 items-start">
                      <div>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select distance" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DISTANCE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <FormField
                        control={form.control}
                        name="transportType"
                        render={({ field }) => (
                          <div className="flex items-center gap-2 justify-around h-10">
                            {TRANSPORT_OPTIONS.map((option) => (
                              <TransportOption
                                key={option.value}
                                value={option.value}
                                current={field.value}
                                onChange={field.onChange}
                                icon={option.icon!}
                                label={option.label}
                              />
                            ))}
                          </div>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Special Care - Advanced Options */}
              <div className="space-y-4 pt-4 border-t border-muted">
                <FormField
                  control={form.control}
                  name="specialCare"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requirements (Optional)</FormLabel>
                      <SelectionGrid
                        options={SPECIAL_CARE_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                        columns={3}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Information */}
              <FormField
                control={form.control}
                name="additionalInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Information (Optional)</FormLabel>
                    <p className="text-sm text-muted-foreground mb-3">
                      Describe what you're looking for in your own words. This helps us find exactly what you want.
                    </p>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., peaceful waterfalls with swimming spots, challenging mountain trails with scenic views, family-friendly parks with picnic areas..."
                        {...field}
                        disabled={isPending}
                        className="min-h-16 resize-none"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex-shrink-0 pt-6 border-t border-muted">
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
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
