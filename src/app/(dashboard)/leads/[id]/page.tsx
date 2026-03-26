export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { fetchLeadDetail } from '@/lib/queries/leads'
import { LeadDetail } from '@/components/leads/lead-detail'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { getRole, getMarketerBrokerIds } from '@/lib/auth/role'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await fetchLeadDetail(id)

  // Verify marketer can only see leads assigned to their brokers
  const role = await getRole()
  if (role === 'marketer' && result) {
    const brokerIds = await getMarketerBrokerIds()
    if (!result.lead.assigned_broker_id || !brokerIds.includes(result.lead.assigned_broker_id)) redirect('/')
  }

  if (!result) {
    return (
      <div className="space-y-4">
        <Link href="/leads"><Button variant="ghost" size="sm"><ChevronLeft className="size-4 mr-1" /> Back to Leads</Button></Link>
        <p className="text-muted-foreground">Lead not found.</p>
      </div>
    )
  }

  const name = [result.lead.first_name, result.lead.last_name].filter(Boolean).join(' ') || 'Unknown Lead'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leads"><Button variant="ghost" size="sm"><ChevronLeft className="size-4 mr-1" /> Leads</Button></Link>
        <h1 className="text-2xl font-semibold">{name}</h1>
      </div>
      <LeadDetail lead={result.lead} deliveries={result.deliveries} activityLog={result.activityLog} routingLogs={result.routingLogs} />
    </div>
  )
}
