import { z } from 'zod'

const VERTICALS = [
  'MCA',
  'SBA',
  'Equipment Finance',
  'Working Capital',
  'Lines of Credit',
] as const

export const verticalOptions = VERTICALS

export const DELIVERY_METHOD_OPTIONS = ['crm_webhook', 'email', 'sms'] as const
export type DeliveryMethod = (typeof DELIVERY_METHOD_OPTIONS)[number]

export const TIMEZONE_OPTIONS = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const

export const CONTACT_HOURS_OPTIONS = ['anytime', 'business_hours', 'custom'] as const

export const ASSIGNMENT_STATUS_OPTIONS = ['active', 'paused'] as const

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
  // Operational settings
  delivery_methods: z.array(z.enum(DELIVERY_METHOD_OPTIONS)).optional(),
  crm_webhook_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  timezone: z.enum(TIMEZONE_OPTIONS).or(z.literal('')).optional(),
  contact_hours: z.enum(CONTACT_HOURS_OPTIONS).optional(),
  custom_hours_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM format').or(z.literal('')).optional(),
  custom_hours_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM format').or(z.literal('')).optional(),
  weekend_pause: z.boolean().optional(),
  assignment_status: z.enum(ASSIGNMENT_STATUS_OPTIONS).optional(),
})

export type BrokerFormData = z.infer<typeof brokerSchema>
