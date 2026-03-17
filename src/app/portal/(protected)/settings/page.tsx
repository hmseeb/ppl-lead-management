import { requireBrokerSession } from '@/lib/portal/guard'
import { getPortalBrokerSettings } from '@/lib/portal/queries'
import { SettingsForm } from '@/components/portal/settings-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function BrokerSettingsPage() {
  const { brokerId } = await requireBrokerSession()
  const settings = await getPortalBrokerSettings(brokerId)

  return (
    <div className="space-y-6 pt-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link
          href="/portal"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      <SettingsForm settings={settings} />
    </div>
  )
}
