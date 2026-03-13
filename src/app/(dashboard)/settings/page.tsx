export const dynamic = 'force-dynamic'

import { fetchSettings } from '@/lib/actions/settings'
import { SettingsForm } from '@/components/admin/settings-form'

export default async function SettingsPage() {
  const settings = await fetchSettings()

  if (!settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">No settings found. Run the admin_settings migration first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsForm
        defaultValues={{
          alert_ghl_contact_id: settings.alert_ghl_contact_id,
          alert_sms_enabled: settings.alert_sms_enabled,
          failure_alert_enabled: settings.failure_alert_enabled,
          unassigned_alert_enabled: settings.unassigned_alert_enabled,
          dedup_window_minutes: settings.dedup_window_minutes,
        }}
      />
    </div>
  )
}
