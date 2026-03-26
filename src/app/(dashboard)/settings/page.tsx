export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { fetchSettings } from '@/lib/actions/settings'
import { fetchPrices } from '@/lib/actions/pricing'
import { createAdminClient } from '@/lib/supabase/admin'
import { SettingsForm } from '@/components/admin/settings-form'
import { PricingTable } from '@/components/admin/pricing-table'
import { getRole } from '@/lib/auth/role'

export default async function SettingsPage() {
  const role = await getRole()
  if (role !== 'admin') redirect('/')
  const [settings, prices, brokersResult] = await Promise.all([
    fetchSettings(),
    fetchPrices(),
    createAdminClient()
      .from('brokers')
      .select('id, first_name, last_name')
      .eq('assignment_status', 'active')
      .order('first_name'),
  ])

  const brokers = brokersResult.data ?? []

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        {settings ? (
          <SettingsForm
            defaultValues={{
              alert_ghl_contact_id: settings.alert_ghl_contact_id,
              alert_sms_enabled: settings.alert_sms_enabled,
              failure_alert_enabled: settings.failure_alert_enabled,
              unassigned_alert_enabled: settings.unassigned_alert_enabled,
              dedup_window_minutes: settings.dedup_window_minutes,
            }}
          />
        ) : (
          <p className="text-muted-foreground">No settings found. Run the admin_settings migration first.</p>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent" />

      <PricingTable
        prices={prices as any}
        brokers={brokers}
      />
    </div>
  )
}
