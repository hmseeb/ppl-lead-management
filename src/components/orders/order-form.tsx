'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { orderSchema, type OrderFormData, VERTICALS, PRIORITIES, ORDER_TYPES } from '@/lib/schemas/order'
import { createOrder, updateOrder } from '@/lib/actions/orders'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'

interface Broker {
  id: string
  first_name: string
  last_name: string
  company: string | null
  primary_vertical: string | null
  secondary_vertical: string | null
}

interface OrderFormProps {
  brokers: Broker[]
  orderId?: string
  initialData?: OrderFormData
}

export function OrderForm({ brokers, orderId, initialData }: OrderFormProps) {
  const router = useRouter()
  const isEdit = !!orderId
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: initialData ?? {
      broker_id: '',
      total_leads: 1,
      verticals: [],
      credit_score_min: null,
      loan_min: null,
      loan_max: null,
      priority: 'normal' as const,
      order_type: 'one_time' as const,
    },
  })

  const selectedVerticals = watch('verticals') || []
  const selectedBrokerId = watch('broker_id')

  // Auto-populate verticals from broker profile when broker changes (only for new orders)
  const prevBrokerRef = React.useRef(initialData?.broker_id ?? '')
  React.useEffect(() => {
    if (!isEdit && selectedBrokerId && selectedBrokerId !== prevBrokerRef.current) {
      prevBrokerRef.current = selectedBrokerId
      const broker = brokers.find((b) => b.id === selectedBrokerId)
      if (broker) {
        const preselected = [broker.primary_vertical, broker.secondary_vertical]
          .filter((v): v is string => v != null && VERTICALS.includes(v as (typeof VERTICALS)[number]))
        if (preselected.length > 0) {
          setValue('verticals', preselected as OrderFormData['verticals'])
        }
      }
    }
  }, [selectedBrokerId, brokers, setValue, isEdit])

  function handleVerticalToggle(vertical: (typeof VERTICALS)[number]) {
    const current = selectedVerticals as string[]

    if (vertical === 'All') {
      if (current.includes('All')) {
        setValue('verticals', [])
      } else {
        setValue('verticals', ['All'])
      }
      return
    }

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
    const result = isEdit
      ? await updateOrder(orderId!, data)
      : await createOrder(data)

    if ('error' in result && result.error) {
      const errorObj = result.error as Record<string, string[]>
      if (errorObj._form) {
        toast.error(errorObj._form[0])
      } else {
        toast.error('Please fix the form errors')
      }
      return
    }

    toast.success(isEdit ? 'Order updated' : 'Order created')
    router.push('/orders')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="broker_id">Broker</Label>
        <Controller
          control={control}
          name="broker_id"
          render={({ field }) => (
            <Select value={field.value || '_none'} onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a broker..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Select a broker...</SelectItem>
                {brokers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.first_name} {b.last_name}
                    {b.company ? ` (${b.company})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
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

      <div className="space-y-1.5">
        <Label>Loan Amount Range (optional)</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={0}
            placeholder="Min ($)"
            {...register('loan_min', {
              setValueAs: (v: string) => (v === '' || v === undefined ? null : Number(v)),
            })}
          />
          <Input
            type="number"
            min={0}
            placeholder="Max ($)"
            {...register('loan_max', {
              setValueAs: (v: string) => (v === '' || v === undefined ? null : Number(v)),
            })}
          />
        </div>
        {errors.loan_max && (
          <p className="text-sm text-destructive">{errors.loan_max.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="priority">Priority</Label>
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p === 'normal' ? 'Normal' : 'High'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="order_type">Order Type</Label>
        <Controller
          control={control}
          name="order_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t === 'one_time' ? 'One-time' : 'Monthly'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex items-center gap-3">
        <Link href="/orders" className={buttonVariants({ variant: 'outline' })}>
          Back
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Order')}
        </Button>
      </div>
    </form>
  )
}
