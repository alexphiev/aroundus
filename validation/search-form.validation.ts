import { z } from 'zod'

export const searchFormSchema = z.object({
  locationType: z.enum(['current', 'custom']),
  customLocation: z
    .object({
      name: z.string(),
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  distance: z.string(),
  transportType: z.enum(['public_transport', 'car']),
  locationName: z.string().optional(),
})

export type SearchFormValues = z.infer<typeof searchFormSchema>
