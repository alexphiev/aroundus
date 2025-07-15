import {
  discoverySubmissionSchema,
  DiscoverySubmissionValues,
} from '@/schemas/form.schema'
import {
  DiscoverError,
  DiscoverErrorType,
  DiscoverResult,
} from '@/types/result.types'

// Validation function - extracted from main function
export function validateDiscoverySubmission(
  data: unknown
): DiscoverResult<DiscoverySubmissionValues> {
  const parseResult = discoverySubmissionSchema.safeParse(data)

  if (!parseResult.success) {
    return {
      success: false,
      error: createDiscoverError(
        DiscoverErrorType.VALIDATION_ERROR,
        'Invalid search criteria provided',
        parseResult.error.flatten(),
        false,
        'Please check your search criteria and try again.'
      ),
    }
  }

  return {
    success: true,
    data: parseResult.data,
  }
}

// Helper function to create typed errors
export const createDiscoverError = (
  type: DiscoverErrorType,
  message: string,
  details?: unknown,
  retryable: boolean = false,
  userFriendlyMessage?: string
): DiscoverError => {
  return {
    type,
    message,
    details,
    retryable,
    userFriendlyMessage: userFriendlyMessage || message,
  }
}
