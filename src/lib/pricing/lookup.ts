import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Look up the per-lead price in cents for a given vertical + credit score minimum.
 * Finds the highest credit tier that the score qualifies for.
 * e.g. score 650 matches tier 600, score 720 matches tier 680.
 * If a brokerId is provided, checks for a broker-specific override first.
 * Falls back to the default price (broker_id IS NULL).
 * Returns null if no price is configured.
 */
export async function getLeadPrice(
  vertical: string,
  creditScoreMin: number,
  brokerId?: string
): Promise<number | null> {
  const supabase = createAdminClient()

  // Check broker-specific override first (highest tier <= requested score)
  if (brokerId) {
    const { data: override } = await supabase
      .from('lead_prices')
      .select('price_cents')
      .eq('vertical', vertical)
      .lte('credit_tier_min', creditScoreMin)
      .eq('broker_id', brokerId)
      .order('credit_tier_min', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (override) return override.price_cents
  }

  // Fall back to default price (highest tier <= requested score)
  const { data: defaultPrice } = await supabase
    .from('lead_prices')
    .select('price_cents')
    .eq('vertical', vertical)
    .lte('credit_tier_min', creditScoreMin)
    .is('broker_id', null)
    .order('credit_tier_min', { ascending: false })
    .limit(1)
    .maybeSingle()

  return defaultPrice?.price_cents ?? null
}
