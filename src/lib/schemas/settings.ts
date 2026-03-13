import { z } from 'zod'

export const settingsSchema = z.object({
  alert_ghl_contact_id: z.string().min(1, 'GHL Contact ID is required'),
  alert_sms_enabled: z.boolean(),
  failure_alert_enabled: z.boolean(),
  unassigned_alert_enabled: z.boolean(),
  dedup_window_minutes: z.coerce.number().int().min(1, 'Minimum 1 minute').max(120, 'Maximum 120 minutes'),
})

export type SettingsFormData = z.infer<typeof settingsSchema>
