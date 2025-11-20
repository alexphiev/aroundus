'use server'

import { authenticateUser, getSupabaseClient } from '@/services/auth.service'
import { z } from 'zod'

// Define the structure of a trip to be saved, matching the TripResult and table schema
const PlaceDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  lat: z.number(),
  long: z.number(),
  landscape: z.string().optional(),
  activity: z.string().optional(),
  estimatedActivityDuration: z.string().optional(),
  estimatedTransportTime: z.string().optional(),
  starRating: z.number().optional(),
  bestTimeToVisit: z.string().optional(),
  timeToAvoid: z.string().optional(),
  // Enhanced location data from Google Search
  googleMapsLink: z.string().optional(),
  googleMapsUri: z.string().optional(),
  operatingHours: z.string().optional(),
  entranceFee: z.string().optional(),
  parkingInfo: z.string().optional(),
  accessibilityInfo: z.string().optional(),
  currentConditions: z.string().optional(),
})

export type PlaceToSave = z.infer<typeof PlaceDataSchema>

export async function getSavedPlacesAction() {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const supabase = await getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', authResult.user!.id)

    if (error) {
      console.error('Supabase error getting saved places:', error)
      return { error: `Failed to get saved places: ${error.message}` }
    }

    // Map snake_case fields from database to camelCase for frontend
    const mappedData =
      data?.map((place) => ({
        id: place.id,
        name: place.name,
        description: place.description,
        lat: place.lat,
        long: place.long,
        landscape: place.landscape,
        activity: place.activity,
        estimatedActivityDuration: place.estimated_activity_duration,
        estimatedTransportTime: place.estimated_transport_time,
        starRating: place.star_rating,
        bestTimeToVisit: place.best_time_to_visit,
        timeToAvoid: place.time_to_avoid,
        googleMapsLink: place.google_maps_link,
        googleMapsUri: place.google_maps_link, // Same as googleMapsLink for compatibility
        operatingHours: place.operating_hours,
        entranceFee: place.entrance_fee,
        parkingInfo: place.parking_info,
        currentConditions: place.current_conditions,
        created_at: place.created_at,
      })) || []

    return { success: true, data: mappedData }
  } catch (error) {
    console.error('Unexpected error getting saved trips:', error)
    return {
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

export async function savePlaceAction(placeData: PlaceToSave) {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const supabase = await getSupabaseClient()

  const parseResult = PlaceDataSchema.safeParse(placeData)
  if (!parseResult.success) {
    console.error('Invalid place data for saving:', parseResult.error.flatten())
    return {
      error: 'Invalid place data provided.',
      details: parseResult.error.flatten(),
    }
  }

  const {
    name,
    description,
    lat,
    long,
    landscape,
    activity,
    estimatedActivityDuration,
    estimatedTransportTime,
    starRating,
    bestTimeToVisit,
    timeToAvoid,
    googleMapsLink,
    googleMapsUri,
    operatingHours,
    entranceFee,
    parkingInfo,
    accessibilityInfo,
    currentConditions,
  } = parseResult.data

  try {
    const { data, error } = await supabase
      .from('saved_places')
      .insert([
        {
          user_id: authResult.user!.id,
          name,
          description,
          lat,
          long,
          landscape,
          activity,
          estimated_activity_duration: estimatedActivityDuration,
          estimated_transport_time: estimatedTransportTime,
          star_rating: starRating,
          best_time_to_visit: bestTimeToVisit,
          time_to_avoid: timeToAvoid,
          google_maps_link: googleMapsUri || googleMapsLink,
          operating_hours: operatingHours,
          entrance_fee: entranceFee,
          parking_info: parkingInfo,
          current_conditions: currentConditions,
        },
      ])
      .select()

    if (error) {
      console.error('Supabase error saving place:', error)
      if (error.code === '23503' && error.message?.includes('auth.users')) {
        return {
          error:
            'Failed to save place due to a user reference issue. Please try again.',
        }
      }
      if (error.code === '42501') {
        // RLS violation
        return {
          error:
            "You don't have permission to save this place. Please ensure you are logged in.",
        }
      }
      return {
        error: `Failed to save place: ${
          error.message || 'Unknown Supabase error'
        }`,
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error saving place:', error)
    return {
      error: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
