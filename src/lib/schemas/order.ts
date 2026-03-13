import { z } from 'zod'

export const VERTICALS = [
  'MCA',
  'SBA',
  'Equipment Finance',
  'Working Capital',
  'Lines of Credit',
  'All',
] as const

export const PRIORITIES = ['normal', 'high'] as const
export const ORDER_TYPES = ['one_time', 'monthly'] as const

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
  loan_min: z.union([
    z.coerce.number().int().min(0, 'Must be positive'),
    z.literal(null),
  ]),
  loan_max: z.union([
    z.coerce.number().int().min(0, 'Must be positive'),
    z.literal(null),
  ]),
  priority: z.enum(PRIORITIES),
  order_type: z.enum(ORDER_TYPES),
}).refine(
  (data) => data.loan_min === null || data.loan_max === null || data.loan_min <= data.loan_max,
  { message: 'Loan min must be less than or equal to loan max', path: ['loan_max'] }
)

export type OrderFormData = z.infer<typeof orderSchema>
