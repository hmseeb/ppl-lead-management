import { z } from 'zod'

const VERTICALS = [
  'MCA',
  'SBA',
  'Equipment Finance',
  'Working Capital',
  'Lines of Credit',
] as const

export const verticalOptions = VERTICALS

export const brokerSchema = z.object({
  ghl_contact_id: z.string().min(1, 'GHL Contact ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(7, 'Phone must be at least 7 characters')
    .or(z.literal(''))
    .optional(),
  company_name: z.string().optional(),
  state: z.string().optional(),
  primary_vertical: z.enum(VERTICALS).or(z.literal('')).optional(),
  secondary_vertical: z.enum(VERTICALS).or(z.literal('')).optional(),
  batch_size: z.coerce
    .number({ invalid_type_error: 'Batch size must be a number' })
    .int('Batch size must be a whole number')
    .positive('Batch size must be positive')
    .max(10000, 'Batch size cannot exceed 10,000'),
  deal_amount: z.coerce
    .number({ invalid_type_error: 'Deal amount must be a number' })
    .positive('Deal amount must be positive')
    .max(10000000, 'Deal amount cannot exceed $10,000,000'),
})

export type BrokerFormData = z.infer<typeof brokerSchema>
