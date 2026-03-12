import { z } from 'zod'

export const VERTICALS = [
  'MCA',
  'SBA',
  'Equipment Finance',
  'Working Capital',
  'Lines of Credit',
  'All',
] as const

export const orderSchema = z.object({
  broker_id: z.string().uuid('Select a broker'),
  total_leads: z.coerce.number().int().min(1, 'Must be at least 1 lead'),
  verticals: z
    .array(z.enum(VERTICALS))
    .min(1, 'Select at least one vertical'),
  credit_score_min: z
    .union([
      z.coerce.number().int().min(300, 'Minimum credit score is 300').max(850, 'Maximum credit score is 850'),
      z.literal(null),
    ]),
})

export type OrderFormData = z.infer<typeof orderSchema>
