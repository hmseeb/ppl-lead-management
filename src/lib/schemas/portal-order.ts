import { z } from 'zod'
import { PRICING_VERTICALS, CREDIT_TIERS } from '@/lib/schemas/pricing'

export const portalOrderSchema = z.object({
  vertical: z.enum(PRICING_VERTICALS),
  credit_tier_min: z.coerce.number().refine(
    (v): v is 600 | 680 => CREDIT_TIERS.includes(v as 600 | 680),
    { message: 'Must be 600 or 680' }
  ),
  lead_count: z.coerce.number().int().min(1, 'Must order at least 1 lead').max(1000, 'Max 1000 leads per order'),
})

export type PortalOrderFormData = z.infer<typeof portalOrderSchema>
