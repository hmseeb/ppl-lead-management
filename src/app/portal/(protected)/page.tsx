import { requireBrokerSession } from '@/lib/portal/guard'
import {
  getPortalBroker,
  fetchBrokerActiveOrders,
  fetchBrokerRecentLeads,
  fetchBrokerSpendSummary,
  fetchBrokerDeliveryHealth,
} from '@/lib/portal/queries'
import {
  ActiveOrdersCard,
  RecentLeadsCard,
  SpendSummaryCard,
  DeliveryHealthCard,
} from '@/components/portal/dashboard-cards'

export default async function PortalHomePage() {
  const { brokerId } = await requireBrokerSession()

  const [broker, activeOrders, recentLeads, spend, deliveryHealth] =
    await Promise.all([
      getPortalBroker(brokerId),
      fetchBrokerActiveOrders(brokerId),
      fetchBrokerRecentLeads(brokerId, 20),
      fetchBrokerSpendSummary(brokerId),
      fetchBrokerDeliveryHealth(brokerId),
    ])

  return (
    <div className="space-y-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome, {broker?.first_name ?? 'Broker'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here is your dashboard overview.
        </p>
      </div>

      {/* Active Orders - full width */}
      <ActiveOrdersCard orders={activeOrders} />

      {/* Spend + Delivery Health - side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SpendSummaryCard spend={spend} />
        <DeliveryHealthCard health={deliveryHealth} />
      </div>

      {/* Recent Leads - full width */}
      <RecentLeadsCard leads={recentLeads} />
    </div>
  )
}
