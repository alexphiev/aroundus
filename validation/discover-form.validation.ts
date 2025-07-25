import { z } from 'zod'

// Base schema without refinements
const baseDiscoverySchema = z.object({
  // Location selection fields
  locationType: z.enum(['current', 'custom'], {
    message: 'Please select a location type.',
  }),
  customLocation: z
    .object(
      {
        name: z.string(),
        lat: z.number(),
        lng: z.number(),
      },
      {
        message: 'Please enter a location.',
      }
    )
    .optional(),

  // Existing fields
  activity: z.string().min(1, { message: 'Please select an activity.' }),
  otherActivity: z.string().optional(),
  when: z.string().optional(),
  customDate: z.date().optional(),
  specialCare: z
    .enum(['children', 'lowMobility', 'dogs', 'other'], {
      message: 'Please select special care requirements.',
    })
    .optional(),
  otherSpecialCare: z.string().optional(),
  distance: z.string().min(1, { message: 'Please select a distance.' }),
  transportType: z.enum(['foot', 'bike', 'public_transport', 'car'], {
    message: 'Please select a transport type.',
  }),
  activityLevel: z.number().min(1).max(5).optional(),
  activityDurationValue: z.coerce.number().min(1).optional(),
  activityDurationUnit: z.enum(['hours', 'days']).optional(),
  additionalInfo: z.string().optional(),
})

// API submission schema (old format without location selection fields)
const baseApiSchema = z.object({
  activity: z.string().min(1, { message: 'Please select an activity.' }),
  otherActivity: z.string().optional(),
  when: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  customDate: z.date().optional(),
  specialCare: z
    .enum(['children', 'lowMobility', 'dogs', 'other'], {
      message: 'Please select special care requirements.',
    })
    .optional(),
  otherSpecialCare: z.string().optional(),
  distance: z.string().min(1, { message: 'Please select a distance.' }),
  transportType: z.enum(['foot', 'bike', 'public_transport', 'car'], {
    message: 'Please select a transport type.',
  }),
  activityLevel: z.number().min(1).max(5).optional(),
  activityDurationValue: z.coerce.number().min(1).optional(),
  activityDurationUnit: z.enum(['hours', 'days']).optional(),
  additionalInfo: z.string().optional(),
})

// Form schema with validation refinements
export const discoveryFormSchema = baseDiscoverySchema
  .refine(
    (data) => {
      // If locationType is "custom", customLocation is required
      if (data.locationType === 'custom' && !data.customLocation) {
        return false
      }
      return true
    },
    {
      message: 'Please select a location.',
      path: ['customLocation'],
    }
  )
  .refine(
    (data) => {
      // If activity is "other", otherActivity is required
      if (data.activity === 'other' && !data.otherActivity?.trim()) {
        return false
      }
      return true
    },
    {
      message: "Please describe your activity when selecting 'Other'.",
      path: ['otherActivity'],
    }
  )
  .refine(
    (data) => {
      // If when is "custom", customDate is required
      if (data.when === 'custom' && !data.customDate) {
        return false
      }
      return true
    },
    {
      message: 'Please select a custom date.',
      path: ['customDate'],
    }
  )
  .refine(
    (data) => {
      // If specialCare is "other", otherSpecialCare is required
      if (data.specialCare === 'other' && !data.otherSpecialCare?.trim()) {
        return false
      }
      return true
    },
    {
      message:
        "Please describe your special requirements when selecting 'Other'.",
      path: ['otherSpecialCare'],
    }
  )

// API submission schema (extends base API schema with resolved location)
export const discoverySubmissionSchema = baseApiSchema
  .extend({
    // For backward compatibility and API usage
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    locationName: z.string().optional(),
  })
  .refine(
    (data) => {
      // If activity is "other", otherActivity is required
      if (data.activity === 'other' && !data.otherActivity?.trim()) {
        return false
      }
      return true
    },
    {
      message: "Please describe your activity when selecting 'Other'.",
      path: ['otherActivity'],
    }
  )
  .refine(
    (data) => {
      // If when is "custom", customDate is required
      if (data.when === 'custom' && !data.customDate) {
        return false
      }
      return true
    },
    {
      message: 'Please select a custom date.',
      path: ['customDate'],
    }
  )
  .refine(
    (data) => {
      // If specialCare is "other", otherSpecialCare is required
      if (data.specialCare === 'other' && !data.otherSpecialCare?.trim()) {
        return false
      }
      return true
    },
    {
      message:
        "Please describe your special requirements when selecting 'Other'.",
      path: ['otherSpecialCare'],
    }
  )

// AI mapping schema (subset for AI processing)
export const aiMappingSchema = z.object({
  activity: z.string(),
  when: z.string(),
  specialCare: z
    .enum(['children', 'lowMobility', 'dogs', 'other'])
    .nullable()
    .optional(),
  otherSpecialCare: z.string().optional(),
  distance: z.string(),
  activityLevel: z.number().min(1).max(5),
  activityDurationValue: z.number().min(1),
  activityDurationUnit: z.enum(['hours', 'days']),
  transportType: z.enum(['foot', 'bike', 'public_transport', 'car']),
  additionalInfo: z.string().optional(),
})

// Infer types
export type DiscoveryFormValues = z.infer<typeof discoveryFormSchema>
export type DiscoverySubmissionValues = z.infer<
  typeof discoverySubmissionSchema
>
export type AiMappingValues = z.infer<typeof aiMappingSchema>
