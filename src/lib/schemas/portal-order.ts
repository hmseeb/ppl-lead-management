import { z } from 'zod'
import { PRICING_VERTICALS } from '@/lib/schemas/pricing'

export const portalOrderSchema = z.object({
  vertical: z.enum(PRICING_VERTICALS),
  credit_tier_min: z.coerce.number().int().min(500, 'Minimum credit score is 500').max(850, 'Maximum credit score is 850'),
  lead_count: z.coerce.number().int().min(1, 'Must order at least 1 lead').max(1000, 'Max 1000 leads per order'),
})

export type PortalOrderFormData = z.infer<typeof portalOrderSchema>
