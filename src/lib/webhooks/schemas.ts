import { z } from 'zod'

export const incomingLeadSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(7).optional().or(z.literal('')),
  business_name: z.string().optional(),
  vertical: z.string().min(1).optional(),
  credit_score: z.coerce.number().int().min(300).max(850).optional(),
  funding_amount: z.coerce.number().positive().optional(),
  funding_purpose: z.string().optional(),
  state: z.string().optional(),
  ai_call_notes: z.string().optional(),
  ai_call_status: z.string().optional(),
  ghl_contact_id: z.string().min(1),
})

export type IncomingLeadPayload = z.infer<typeof incomingLeadSchema>
