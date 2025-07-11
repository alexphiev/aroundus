import { createClient } from '@/utils/supabase/server'
import { User } from '@supabase/supabase-js'

export interface AuthResult {
  user: User | null
  error: string | null
}

/**
 * Centralized authentication service for server actions
 * Handles user authentication checks with consistent error messages
 */
export async function authenticateUser(): Promise<AuthResult> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('Authentication error:', userError)
      return {
        user: null,
        error: 'Authentication failed. Please sign in again.',
      }
    }

    if (!user) {
      console.error('User not authenticated')
      return {
        user: null,
        error: 'User not authenticated. Please sign in again.',
      }
    }

    return {
      user,
      error: null,
    }
  } catch (error) {
    console.error('Unexpected authentication error:', error)
    return {
      user: null,
      error: 'Authentication service unavailable. Please try again.',
    }
  }
}

/**
 * Higher-order function that wraps server actions with authentication
 * Usage: const protectedAction = withAuth(yourAction);
 */
export function withAuth<T extends unknown[], R>(
  action: (user: User, ...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | { error: string }> => {
    const authResult = await authenticateUser()

    if (authResult.error || !authResult.user) {
      return { error: authResult.error || 'Authentication required' }
    }

    try {
      return await action(authResult.user, ...args)
    } catch (error) {
      console.error('Error in protected action:', error)
      throw error // Re-throw to let the calling action handle it
    }
  }
}

/**
 * Get Supabase client (for cases where you need the client after auth)
 */
export async function getSupabaseClient() {
  return await createClient()
}
