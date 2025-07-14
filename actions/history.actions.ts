'use server'

import { getSupabaseClient } from '@/lib/auth.service'
import { authenticateUser } from '@/lib/auth.service'
import * as z from 'zod'
import type {
  SaveSearchResponse,
  SearchHistoryResponse,
  SearchQuery,
  SearchResult,
} from '@/types/search-history.types'

// Schema for search criteria
const searchCriteriaSchema = z.object({
  activity: z.string(),
  when: z.string(),
  specialCare: z.enum(['children', 'lowMobility', 'dogs']).optional(),
  distance: z.string(),
  activityLevel: z.number().min(1).max(5),
  activityDurationValue: z.number(),
  activityDurationUnit: z.enum(['hours', 'days']),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  locationName: z.string().optional(),
  additionalInfo: z.string().optional(),
  transportType: z.enum(['foot', 'bike', 'public_transport', 'car']).optional(),
})

// Schema for photo data
const photoSchema = z.object({
  url: z.string(),
  attribution: z.string().optional(),
})

// Schema for review data  
const reviewSchema = z.object({
  author: z.string(),
  rating: z.number(),
  text: z.string(),
  publishTime: z.string(),
  authorPhotoUrl: z.string().optional(),
})

// Schema for search results (including Google Places data)
const searchResultSchema = z.object({
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
  // Google Places data
  photos: z.array(photoSchema).optional(),
  reviews: z.array(reviewSchema).optional(),
  googleRating: z.number().optional(),
  reviewCount: z.number().optional(),
  // Other fields
  id: z.string().optional(),
  transportMode: z.string().optional(),
  userFeedback: z.enum(['liked', 'disliked']).nullable().optional(),
})

// Save search to history
export async function saveSearchToHistory(
  query: SearchQuery,
  results: SearchResult[],
  hasMoreResults: boolean = false,
  currentBatch: number = 1,
  title?: string
): Promise<SaveSearchResponse> {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const supabase = await getSupabaseClient()

  try {
    // Validate the data
    const validatedQuery = searchCriteriaSchema.parse(query)
    const validatedResults = results.map((result) =>
      searchResultSchema.parse(result)
    )

    const { data, error } = await supabase
      .from('search_history')
      .insert({
        user_id: authResult.user!.id,
        query: validatedQuery,
        results: validatedResults,
        current_batch: currentBatch,
        has_more_results: hasMoreResults,
        total_results_loaded: validatedResults.length,
        title: title,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving search history:', error)
      return { error: 'Failed to save search history.' }
    }

    return { success: true, data: data as any }
  } catch (error) {
    console.error('Error validating or saving search history:', error)
    return { error: 'Failed to save search history due to validation error.' }
  }
}

// Get latest search from history
export async function getLatestSearchFromHistory(): Promise<SearchHistoryResponse> {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const supabase = await getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', authResult.user!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No results found
        return { success: true, data: null }
      }
      console.error('Error getting latest search history:', error)
      return { error: 'Failed to get search history.' }
    }

    return { success: true, data: data as any }
  } catch (error) {
    console.error('Error getting latest search history:', error)
    return { error: 'Failed to get search history.' }
  }
}

// Get all search history for a user
export async function getUserSearchHistory(): Promise<SearchHistoryResponse> {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const supabase = await getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', authResult.user!.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting user search history:', error)
      return { error: 'Failed to get search history.' }
    }

    return { success: true, data: (data || []) as any }
  } catch (error) {
    console.error('Error getting user search history:', error)
    return { error: 'Failed to get search history.' }
  }
}

// Update search history with additional results
export async function updateSearchHistoryResults(
  allResults: SearchResult[],
  hasMoreResults: boolean = false,
  currentBatch: number = 1,
  title?: string
): Promise<SaveSearchResponse> {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const supabase = await getSupabaseClient()

  try {
    // Validate the results
    const validatedResults = allResults.map((result) =>
      searchResultSchema.parse(result)
    )

    // Get the latest search history record
    const { data: latestSearch, error: getError } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', authResult.user!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (getError || !latestSearch) {
      console.error('Error getting latest search to update:', getError)
      return { error: 'No recent search found to update.' }
    }

    // Update the results in the latest search
    const updateData: any = {
      results: validatedResults,
      current_batch: currentBatch,
      has_more_results: hasMoreResults,
      total_results_loaded: validatedResults.length,
      updated_at: new Date().toISOString(),
    }
    
    // Only update title if provided
    if (title) {
      updateData.title = title
    }

    const { data, error } = await supabase
      .from('search_history')
      .update(updateData)
      .eq('id', latestSearch.id)
      .eq('user_id', authResult.user!.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating search history:', error)
      return { error: 'Failed to update search history.' }
    }

    return { success: true, data: data as any }
  } catch (error) {
    console.error('Error validating or updating search history:', error)
    return { error: 'Failed to update search history due to validation error.' }
  }
}

// Delete a search from history
export async function deleteSearchFromHistory(
  searchId: string
): Promise<SaveSearchResponse> {
  // Check authentication
  const authResult = await authenticateUser()
  if (authResult.error) {
    return { error: authResult.error }
  }

  const supabase = await getSupabaseClient()

  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', searchId)
      .eq('user_id', authResult.user!.id)

    if (error) {
      console.error('Error deleting search history:', error)
      return { error: 'Failed to delete search history.' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting search history:', error)
    return { error: 'Failed to delete search history.' }
  }
}
