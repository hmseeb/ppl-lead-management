import { getSession } from './session'
import { getMarketerSession } from './marketer-session'
import { createAdminClient } from '@/lib/supabase/admin'

export type Role = 'admin' | 'marketer'

export async function getRole(): Promise<Role> {
  const session = await getSession()
  if (session.isLoggedIn) return 'admin'
  const marketerSession = await getMarketerSession()
  if (marketerSession.isMarketer) return 'marketer'
  // This should not happen (middleware should have redirected), but default to admin
  return 'admin'
}

export async function getMarketerBrokerIds(): Promise<string[]> {
  const marketerSession = await getMarketerSession()
  if (!marketerSession.isMarketer) return []
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('marketer_brokers')
    .select('broker_id')
    .eq('marketer_id', marketerSession.marketerId)
  const ids = (data ?? []).map(r => r.broker_id)
  // Return impossible ID if no brokers assigned, so queries return empty instead of all
  return ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']
}

// Helper: get marketer ID if role is marketer, null otherwise
export async function getMarketerId(): Promise<string | null> {
  const marketerSession = await getMarketerSession()
  return marketerSession.isMarketer ? marketerSession.marketerId : null
}
