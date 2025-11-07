'use client'

import { CustomFormLabel } from '@/components/discovery/form/CustomFormLabel'
import { LocationSelection } from '@/components/discovery/form/LocationSelection'
import { TransportOption } from '@/components/discovery/form/TransportOptions'
import { Button } from '@/components/ui/button'
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
import {
  ACTIVITY_OPTIONS,
  DISTANCE_OPTIONS,
  TRANSPORT_OPTIONS,
} from '@/constants/discover.constants'
import type { SearchFormValues } from '@/validation/search-form.validation'
import { Loader2, Search } from 'lucide-react'
import { UseFormReturn } from 'react-hook-form'

interface SearchFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  form: UseFormReturn<SearchFormValues>
  onSubmit: (values: SearchFormValues) => void
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
}: SearchFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95dvh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Search Places</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="-mx-4 flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-2 pr-6">
              <div className="flex flex-col gap-12">
                {locationError && (
                  <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
                    <p className="text-destructive text-sm">{locationError}</p>
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

                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <LocationSelection
                          locationType={field.value}
                          onLocationTypeChange={(type) => {
                            field.onChange(type)
                            form.trigger('customLocation')
                          }}
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
                            form.trigger('customLocation')
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

                <FormField
                  control={form.control}
                  name="activity"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel>
                        What would you like to do?
                      </CustomFormLabel>
                      <FormControl>
                        <SelectionGrid
                          options={ACTIVITY_OPTIONS.filter(
                            (opt) => opt.value !== 'other'
                          )}
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>
            </div>

            <div className="border-muted flex-shrink-0 border-t pt-6">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="text-primary mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Search
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
