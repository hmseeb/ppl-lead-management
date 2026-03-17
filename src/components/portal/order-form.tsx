'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createCheckoutSession, lookupPrice } from '@/lib/actions/portal-order'
import { PRICING_VERTICALS } from '@/lib/schemas/pricing'
import { ShoppingCart, Loader2 } from 'lucide-react'

export function OrderForm() {
  const [vertical, setVertical] = useState('')
  const [creditTierMin, setCreditTierMin] = useState('')
  const [leadCount, setLeadCount] = useState('')
  const [priceCents, setPriceCents] = useState<number | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Look up price when vertical + credit tier are both selected
  const fetchPrice = useCallback(async (v: string, ct: string) => {
    if (!v || !ct) {
      setPriceCents(null)
      return
    }
    setPriceLoading(true)
    try {
      const result = await lookupPrice(v, parseInt(ct, 10))
      setPriceCents(result.priceCents)
    } catch {
      setPriceCents(null)
    } finally {
      setPriceLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrice(vertical, creditTierMin)
  }, [vertical, creditTierMin, fetchPrice])

  const count = parseInt(leadCount, 10) || 0
  const totalCents = priceCents && count > 0 ? priceCents * count : null

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createCheckoutSession({
        vertical,
        credit_tier_min: creditTierMin ? parseInt(creditTierMin, 10) : undefined,
        lead_count: count,
      })

      if (result?.url) {
        window.location.href = result.url
        return
      }

      if (result?.error) {
        const formError = '_form' in result.error
          ? (result.error as Record<string, string[]>)._form?.[0]
          : Object.values(result.error).flat().join(', ')
        setError(formError || 'Validation failed')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Lead Order</CardTitle>
        <CardDescription>
          Select a vertical, credit tier, and number of leads.
          You will be redirected to Stripe to complete payment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-5">
          {/* Vertical */}
          <div className="space-y-2">
            <Label htmlFor="vertical">Vertical</Label>
            <select
              id="vertical"
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">Select vertical...</option>
              {PRICING_VERTICALS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Credit Score Minimum */}
          <div className="space-y-2">
            <Label htmlFor="credit_tier_min">Minimum Credit Score</Label>
            <Input
              id="credit_tier_min"
              type="number"
              min={500}
              max={850}
              placeholder="e.g. 600"
              value={creditTierMin}
              onChange={(e) => setCreditTierMin(e.target.value)}
            />
          </div>

          {/* Lead Count */}
          <div className="space-y-2">
            <Label htmlFor="lead_count">Number of Leads</Label>
            <Input
              id="lead_count"
              type="number"
              min={1}
              max={1000}
              placeholder="e.g. 50"
              value={leadCount}
              onChange={(e) => setLeadCount(e.target.value)}
            />
          </div>

          {/* Price Display */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price per lead</span>
              <span className="font-medium">
                {priceLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : priceCents ? (
                  `$${(priceCents / 100).toFixed(2)}`
                ) : vertical && creditTierMin ? (
                  <span className="text-destructive text-xs">No price set</span>
                ) : (
                  '--'
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">{count > 0 ? count : '--'}</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex items-center justify-between">
              <span className="font-medium">Total</span>
              <span className="text-lg font-semibold">
                {totalCents ? `$${(totalCents / 100).toFixed(2)}` : '--'}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !vertical || !creditTierMin || count < 1 || !priceCents}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Redirecting to Stripe...
              </>
            ) : (
              <>
                <ShoppingCart className="size-4 mr-2" />
                Proceed to Payment
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
