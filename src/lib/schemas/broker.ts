import { z } from 'zod'

export const brokerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  company: z.string(),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  phone: z.string().min(7, 'Phone must be at least 7 characters').or(z.literal('')).optional(),
  crm_webhook_url: z
    .string()
    .url('Must be a valid URL')
    .refine((url) => url.startsWith('https://'), {
      message: 'URL must start with https://',
    })
    .or(z.literal(''))
    .optional(),
})

export type BrokerFormData = z.infer<typeof brokerSchema>
