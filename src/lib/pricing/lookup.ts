import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Look up the per-lead price in cents for a given vertical + credit tier.
 * If a brokerId is provided, checks for a broker-specific override first.
 * Falls back to the default price (broker_id IS NULL).
 * Returns null if no price is configured.
 */
export async function getLeadPrice(
  vertical: string,
  creditTierMin: number,
  brokerId?: string
): Promise<number | null> {
  const supabase = createAdminClient()

  // Check broker-specific override first
  if (brokerId) {
    const { data: override } = await supabase
      .from('lead_prices')
      .select('price_cents')
      .eq('vertical', vertical)
      .eq('credit_tier_min', creditTierMin)
      .eq('broker_id', brokerId)
      .single()

    if (override) return override.price_cents
  }

  // Fall back to default price
  const { data: defaultPrice } = await supabase
    .from('lead_prices')
    .select('price_cents')
    .eq('vertical', vertical)
    .eq('credit_tier_min', creditTierMin)
    .is('broker_id', null)
    .single()

  return defaultPrice?.price_cents ?? null
}
