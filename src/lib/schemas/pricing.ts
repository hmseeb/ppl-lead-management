import { z } from 'zod'

export const PRICING_VERTICALS = [
  'MCA',
  'SBA',
  'Equipment Finance',
  'Working Capital',
  'Lines of Credit',
] as const

export const CREDIT_TIERS = [600, 680] as const

export const pricingSchema = z.object({
  vertical: z.enum(PRICING_VERTICALS),
  credit_tier_min: z.coerce.number().refine(
    (v): v is 600 | 680 => CREDIT_TIERS.includes(v as 600 | 680),
    { message: 'Must be 600 or 680' }
  ),
  price_cents: z.coerce.number().int().min(1, 'Price must be at least 1 cent'),
  broker_id: z.string().uuid().nullable().optional(),
})

export type PricingFormData = z.infer<typeof pricingSchema>
