'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  FullWidthSelect,
  SelectItem,
} from '@/components/ui/custom/full-width-select'
import { SelectionGrid } from '@/components/ui/custom/selection-grid'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import {
  ACTIVITY_DURATION_UNITS,
  ACTIVITY_DURATION_VALUES,
  ACTIVITY_OPTIONS,
  DISTANCE_OPTIONS,
  SPECIAL_CARE_OPTIONS,
  TRANSPORT_OPTIONS,
  WHEN_OPTIONS,
} from '@/constants/discover.constants'
import { cn } from '@/lib/utils'
import type { DiscoveryFormValues } from '@/schemas/form.schema'
import { format } from 'date-fns'
import {
  Activity,
  CalendarIcon,
  Dumbbell,
  Flame,
  Footprints,
  Loader2,
  Search,
  Snowflake,
  Stars,
} from 'lucide-react'
import { UseFormReturn } from 'react-hook-form'
import { CustomFormLabel } from './CustomFormLabel'
import { LocationSelection } from './LocationSelection'
import { TransportOption } from './TransportOptions'

// Get activity level icon based on the selected level
const getActivityLevelIcon = (level: number) => {
  switch (level) {
    case 1:
      return <Snowflake className="h-5 w-5" /> // Very easy
    case 2:
      return <Footprints className="h-5 w-5" /> // Easy
    case 3:
      return <Activity className="h-5 w-5" /> // Medium
    case 4:
      return <Dumbbell className="h-5 w-5" /> // Hard
    case 5:
      return <Flame className="h-5 w-5" /> // Very hard
    default:
      return <Activity className="h-5 w-5" /> // Default
  }
}

// Search Form Modal Props
interface SearchFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  form: UseFormReturn<DiscoveryFormValues>
  onSubmit: (values: DiscoveryFormValues) => void
  isPending: boolean
  locationError: string | null
  onRetryLocation: () => void
  userLocation: { latitude: number; longitude: number } | null
  userLocationInfo: {
    locationName: string
    city?: string
    region?: string
    country?: string
  } | null
  isLoadingAIFilters?: boolean
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
  userLocationInfo,
  isLoadingAIFilters = false,
}: SearchFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95dvh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Plan Your Next Adventure</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="-mx-4 flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-2 pr-6">
              {isLoadingAIFilters ? (
                /* AI Loading State */
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="text-primary mx-auto mb-4 h-8 w-8 animate-spin" />
                    <p className="text-muted-foreground text-sm">
                      Analyzing your search and pre-filling the form...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-12">
                  {/* Location error message - only show if there's a problem */}
                  {locationError && (
                    <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
                      <p className="text-destructive text-sm">
                        {locationError}
                      </p>
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

                  {/* Location Selection - First Priority */}
                  <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <LocationSelection
                            locationType={field.value}
                            onLocationTypeChange={field.onChange}
                            customLocation={
                              form.watch('customLocation')
                                ? {
                                    id: 'custom',
                                    name:
                                      form.watch('customLocation')?.name || '',
                                    displayName:
                                      form.watch('customLocation')?.name || '',
                                    lat: form.watch('customLocation')?.lat || 0,
                                    lng: form.watch('customLocation')?.lng || 0,
                                    type: 'custom',
                                    importance: 1,
                                  }
                                : null
                            }
                            onCustomLocationChange={(location) => {
                              form.setValue(
                                'customLocation',
                                location
                                  ? {
                                      name: location.name,
                                      lat: location.lat,
                                      lng: location.lng,
                                    }
                                  : undefined
                              )
                            }}
                            userLocation={userLocation}
                            userLocationInfo={userLocationInfo}
                            locationError={locationError}
                            onRetryLocation={onRetryLocation}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Search Query - Second Priority */}
                  <FormField
                    control={form.control}
                    name="additionalInfo"
                    render={({ field }) => (
                      <FormItem>
                        <CustomFormLabel className="flex items-center gap-2">
                          <Stars className="h-4 w-4" />
                          Describe what you&apos;re looking for in your own
                          words
                        </CustomFormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., peaceful waterfalls with swimming spots, challenging mountain trails..."
                            {...field}
                            disabled={isPending}
                            className="min-h-16 resize-none text-sm placeholder:text-sm"
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Activity Selection - First Priority */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="activity"
                      render={({ field }) => (
                        <FormItem>
                          <CustomFormLabel>
                            What would you like to do?
                          </CustomFormLabel>
                          <SelectionGrid
                            options={ACTIVITY_OPTIONS}
                            value={field.value}
                            onChange={field.onChange}
                            maxColumns={6}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch('activity') === 'other' && (
                      <FormField
                        control={form.control}
                        name="otherActivity"
                        render={({ field }) => (
                          <FormItem>
                            <CustomFormLabel>
                              Describe your activity
                            </CustomFormLabel>
                            <Input
                              placeholder="e.g., bird watching, sketching, rock climbing..."
                              {...field}
                              disabled={isPending}
                              className="text-sm placeholder:text-sm"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Physical Activity Level & Duration - Two Column Layout */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Physical Activity Level Column */}
                    <FormField
                      control={form.control}
                      name="activityLevel"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <CustomFormLabel>
                            Physical Activity Level
                          </CustomFormLabel>
                          <div className="flex flex-row gap-4">
                            <div className="bg-primary/10 text-primary rounded-full p-2">
                              {getActivityLevelIcon(field.value)}
                            </div>
                            <div className="flex flex-1 flex-col gap-2">
                              <div className="mb-1 text-sm font-medium">
                                {field.value === 1 && 'Very easy'}
                                {field.value === 2 && 'Easy'}
                                {field.value === 3 && 'Moderate'}
                                {field.value === 4 && 'Challenging'}
                                {field.value === 5 && 'Very Challenging'}
                              </div>
                              <FormControl>
                                <Slider
                                  min={1}
                                  max={5}
                                  step={1}
                                  defaultValue={[field.value]}
                                  onValueChange={(value: number[]) =>
                                    field.onChange(value[0])
                                  }
                                  disabled={isPending}
                                  className="w-[80%]"
                                />
                              </FormControl>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Activity Duration Column */}
                    <div className="space-y-3">
                      <CustomFormLabel>Activity Duration</CustomFormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="activityDurationValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <FullWidthSelect
                                  onValueChange={(value) =>
                                    field.onChange(parseInt(value))
                                  }
                                  defaultValue={field.value.toString()}
                                  disabled={isPending}
                                  placeholder="Duration"
                                >
                                  {ACTIVITY_DURATION_VALUES.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </FullWidthSelect>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="activityDurationUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <FullWidthSelect
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  disabled={isPending}
                                  placeholder="Unit"
                                >
                                  {ACTIVITY_DURATION_UNITS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </FullWidthSelect>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* When Selection */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="when"
                      render={({ field }) => (
                        <FormItem>
                          <CustomFormLabel>
                            When would you like to go?
                          </CustomFormLabel>
                          <SelectionGrid
                            options={WHEN_OPTIONS}
                            value={field.value}
                            onChange={field.onChange}
                            maxColumns={4}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch('when') === 'custom' && (
                      <FormField
                        control={form.control}
                        name="customDate"
                        render={({ field }) => (
                          <FormItem>
                            <CustomFormLabel>
                              Select custom date
                            </CustomFormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full pl-3 text-left font-normal',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                    disabled={isPending}
                                  >
                                    {field.value ? (
                                      format(field.value, 'PPP')
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date < new Date() ||
                                    date < new Date('1900-01-01')
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
                        <CustomFormLabel>Distance from you</CustomFormLabel>
                        <div className="flex w-full flex-row items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <FormControl>
                              <FullWidthSelect
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={isPending}
                                placeholder="Select distance"
                                className="h-10"
                              >
                                {DISTANCE_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </FullWidthSelect>
                            </FormControl>
                          </div>

                          <FormField
                            control={form.control}
                            name="transportType"
                            render={({ field }) => (
                              <div className="flex h-10 min-w-fit flex-1 items-center justify-around gap-2">
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
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="specialCare"
                      render={({ field }) => (
                        <FormItem>
                          <CustomFormLabel>
                            Special Requirements (Optional)
                          </CustomFormLabel>
                          <SelectionGrid
                            options={SPECIAL_CARE_OPTIONS}
                            value={field.value}
                            onChange={field.onChange}
                            maxColumns={4}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {form.watch('specialCare') === 'other' && (
                      <FormField
                        control={form.control}
                        name="otherSpecialCare"
                        render={({ field }) => (
                          <FormItem>
                            <CustomFormLabel>
                              Describe your special requirements
                            </CustomFormLabel>
                            <Input
                              placeholder="e.g., wheelchair accessible, quiet environment, pet-friendly..."
                              {...field}
                              disabled={isPending}
                              className="text-sm placeholder:text-sm"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-muted flex-shrink-0 border-t pt-6">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="text-primary mr-2 h-4 w-4 animate-spin" />
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
  )
}
