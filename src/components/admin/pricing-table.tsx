'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { upsertPrice, deletePrice, updatePrice } from '@/lib/actions/pricing'
import { PRICING_VERTICALS, CREDIT_TIERS } from '@/lib/schemas/pricing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'

interface Broker {
  id: string
  first_name: string
  last_name: string
}

interface PriceRow {
  id: string
  vertical: string
  credit_tier_min: number
  price_cents: number
  broker_id: string | null
  brokers: { id: string; first_name: string; last_name: string } | null
}

interface PricingTableProps {
  prices: PriceRow[]
  brokers: Broker[]
}

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export function PricingTable({ prices, brokers }: PricingTableProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCents, setEditCents] = useState('')
  const [isPending, startTransition] = useTransition()

  // Add form state
  const [newVertical, setNewVertical] = useState<string>(PRICING_VERTICALS[0])
  const [newTier, setNewTier] = useState<number>(CREDIT_TIERS[0])
  const [newDollars, setNewDollars] = useState('')
  const [newBrokerId, setNewBrokerId] = useState<string>('')

  function resetAddForm() {
    setNewVertical(PRICING_VERTICALS[0])
    setNewTier(CREDIT_TIERS[0])
    setNewDollars('')
    setNewBrokerId('')
    setShowAdd(false)
  }

  function handleAdd() {
    const dollars = parseFloat(newDollars)
    if (isNaN(dollars) || dollars <= 0) {
      toast.error('Enter a valid price')
      return
    }

    startTransition(async () => {
      const res = await upsertPrice({
        vertical: newVertical,
        credit_tier_min: newTier,
        price_cents: Math.round(dollars * 100),
        broker_id: newBrokerId || null,
      })

      if (res && 'error' in res && res.error) {
        const err = res.error as Record<string, string[]>
        toast.error(err._form?.[0] ?? 'Failed to save price')
      } else {
        toast.success('Price saved')
        resetAddForm()
      }
    })
  }

  function handleEdit(row: PriceRow) {
    setEditingId(row.id)
    setEditCents((row.price_cents / 100).toFixed(2))
  }

  function handleSaveEdit(id: string) {
    const dollars = parseFloat(editCents)
    if (isNaN(dollars) || dollars <= 0) {
      toast.error('Enter a valid price')
      return
    }

    startTransition(async () => {
      const res = await updatePrice(id, Math.round(dollars * 100))
      if (res && 'error' in res && res.error) {
        toast.error(typeof res.error === 'string' ? res.error : 'Failed to update')
      } else {
        toast.success('Price updated')
        setEditingId(null)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this price?')) return

    startTransition(async () => {
      const res = await deletePrice(id)
      if (res && 'error' in res && res.error) {
        toast.error(typeof res.error === 'string' ? res.error : 'Failed to delete')
      } else {
        toast.success('Price deleted')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Lead Pricing</h2>
          <p className="text-sm text-muted-foreground">
            Set per-lead prices by vertical and credit tier. Broker overrides take precedence over defaults.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} disabled={isPending}>
          <Plus className="size-4" />
          Add Price
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vertical</TableHead>
            <TableHead>Credit Tier</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Broker</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {showAdd && (
            <TableRow>
              <TableCell>
                <Select value={newVertical} onValueChange={(v) => v && setNewVertical(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_VERTICALS.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select value={String(newTier)} onValueChange={(v) => setNewTier(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDIT_TIERS.map((t) => (
                      <SelectItem key={t} value={String(t)}>{t}+</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={newDollars}
                  onChange={(e) => setNewDollars(e.target.value)}
                  className="w-24"
                />
              </TableCell>
              <TableCell>
                <Select value={newBrokerId} onValueChange={(v) => setNewBrokerId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Default (all brokers)</SelectItem>
                    {brokers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.first_name} {b.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon-xs" onClick={handleAdd} disabled={isPending}>
                    <Check className="size-3" />
                  </Button>
                  <Button size="icon-xs" variant="ghost" onClick={resetAddForm} disabled={isPending}>
                    <X className="size-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}

          {prices.length === 0 && !showAdd && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No prices configured yet. Click &quot;Add Price&quot; to get started.
              </TableCell>
            </TableRow>
          )}

          {prices.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.vertical}</TableCell>
              <TableCell>{row.credit_tier_min}+</TableCell>
              <TableCell>
                {editingId === row.id ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editCents}
                    onChange={(e) => setEditCents(e.target.value)}
                    className="w-24"
                  />
                ) : (
                  formatDollars(row.price_cents)
                )}
              </TableCell>
              <TableCell>
                {row.brokers
                  ? `${row.brokers.first_name} ${row.brokers.last_name}`
                  : <span className="text-muted-foreground">Default</span>
                }
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {editingId === row.id ? (
                    <>
                      <Button
                        size="icon-xs"
                        onClick={() => handleSaveEdit(row.id)}
                        disabled={isPending}
                      >
                        <Check className="size-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        disabled={isPending}
                      >
                        <X className="size-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleEdit(row)}
                        disabled={isPending}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="destructive"
                        onClick={() => handleDelete(row.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
