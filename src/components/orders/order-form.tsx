'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { orderSchema, type OrderFormData, VERTICALS } from '@/lib/schemas/order'
import { createOrder } from '@/lib/actions/orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface Broker {
  id: string
  first_name: string
  last_name: string
  company: string | null
}

interface OrderFormProps {
  brokers: Broker[]
}

export function OrderForm({ brokers }: OrderFormProps) {
  const router = useRouter()
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      broker_id: '',
      total_leads: 1,
      verticals: [],
      credit_score_min: null,
    },
  })

  const selectedVerticals = watch('verticals') || []

  function handleVerticalToggle(vertical: (typeof VERTICALS)[number]) {
    const current = selectedVerticals as string[]

    if (vertical === 'All') {
      // If "All" is selected, it becomes the only value
      if (current.includes('All')) {
        setValue('verticals', [])
      } else {
        setValue('verticals', ['All'])
      }
      return
    }

    // If selecting a non-All vertical, remove "All" if present
    const withoutAll = current.filter((v) => v !== 'All')

    if (current.includes(vertical)) {
      setValue(
        'verticals',
        withoutAll.filter((v) => v !== vertical) as OrderFormData['verticals']
      )
    } else {
      setValue('verticals', [...withoutAll, vertical] as OrderFormData['verticals'])
    }
  }

  async function onSubmit(data: OrderFormData) {
    const result = await createOrder(data)

    if ('error' in result && result.error) {
      const errorObj = result.error as Record<string, string[]>
      if (errorObj._form) {
        toast.error(errorObj._form[0])
      } else {
        toast.error('Please fix the form errors')
      }
      return
    }

    toast.success('Order created')
    router.push('/orders')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="broker_id">Broker</Label>
        <select
          id="broker_id"
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...register('broker_id')}
        >
          <option value="">Select a broker...</option>
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.first_name} {b.last_name}
              {b.company ? ` (${b.company})` : ''}
            </option>
          ))}
        </select>
        {errors.broker_id && (
          <p className="text-sm text-destructive">{errors.broker_id.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="total_leads">Total Leads</Label>
        <Input
          id="total_leads"
          type="number"
          min={1}
          {...register('total_leads', { valueAsNumber: true })}
        />
        {errors.total_leads && (
          <p className="text-sm text-destructive">{errors.total_leads.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Verticals</Label>
        <Controller
          control={control}
          name="verticals"
          render={() => (
            <div className="grid grid-cols-2 gap-2">
              {VERTICALS.map((vertical) => {
                const isChecked = selectedVerticals.includes(vertical)
                return (
                  <label
                    key={vertical}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleVerticalToggle(vertical)}
                    />
                    {vertical}
                  </label>
                )
              })}
            </div>
          )}
        />
        {errors.verticals && (
          <p className="text-sm text-destructive">{errors.verticals.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="credit_score_min">Minimum Credit Score (optional)</Label>
        <Input
          id="credit_score_min"
          type="number"
          min={300}
          max={850}
          placeholder="No minimum"
          {...register('credit_score_min', {
            setValueAs: (v: string) => (v === '' || v === undefined ? null : Number(v)),
          })}
        />
        {errors.credit_score_min && (
          <p className="text-sm text-destructive">{errors.credit_score_min.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Order'}
      </Button>
    </form>
  )
}
