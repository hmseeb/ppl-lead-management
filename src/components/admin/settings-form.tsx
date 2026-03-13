'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { settingsSchema, type SettingsFormData } from '@/lib/schemas/settings'
import { updateSettings } from '@/lib/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface SettingsFormProps {
  defaultValues: SettingsFormData
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  })

  const alertSms = watch('alert_sms_enabled')
  const failureAlert = watch('failure_alert_enabled')
  const unassignedAlert = watch('unassigned_alert_enabled')

  async function onSubmit(data: SettingsFormData) {
    const result = await updateSettings(data)

    if (result && 'error' in result && result.error) {
      const errorObj = result.error as Record<string, string[]>
      if (errorObj._form) {
        toast.error(errorObj._form[0])
      } else {
        toast.error('Please fix the form errors')
      }
      return
    }

    toast.success('Settings saved')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="alert_ghl_contact_id">Admin GHL Contact ID</Label>
        <Input
          id="alert_ghl_contact_id"
          placeholder="nMirdb2JaFnGmRkGjnFv"
          {...register('alert_ghl_contact_id')}
        />
        <p className="text-xs text-muted-foreground">Contact ID that receives alert SMS and digest emails</p>
        {errors.alert_ghl_contact_id && (
          <p className="text-sm text-destructive">{errors.alert_ghl_contact_id.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dedup_window_minutes">Dedup Window (minutes)</Label>
        <Input
          id="dedup_window_minutes"
          type="number"
          min={1}
          max={120}
          {...register('dedup_window_minutes')}
        />
        <p className="text-xs text-muted-foreground">Suppress duplicate alerts within this window</p>
        {errors.dedup_window_minutes && (
          <p className="text-sm text-destructive">{errors.dedup_window_minutes.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label>Alert Channels</Label>

        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={alertSms}
            onCheckedChange={(checked) => setValue('alert_sms_enabled', !!checked)}
          />
          <span className="text-sm">SMS alerts enabled</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={failureAlert}
            onCheckedChange={(checked) => setValue('failure_alert_enabled', !!checked)}
          />
          <span className="text-sm">Delivery failure alerts</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={unassignedAlert}
            onCheckedChange={(checked) => setValue('unassigned_alert_enabled', !!checked)}
          />
          <span className="text-sm">Unassigned lead alerts</span>
        </label>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  )
}
