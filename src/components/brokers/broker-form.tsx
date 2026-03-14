'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { brokerSchema, verticalOptions, type BrokerFormData } from '@/lib/schemas/broker'
import { createBroker, updateBroker } from '@/lib/actions/brokers'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BrokerFormProps {
  mode?: 'create' | 'edit'
  brokerId?: string
  defaultValues?: Partial<BrokerFormData>
}

export function BrokerForm({ mode = 'create', brokerId, defaultValues }: BrokerFormProps) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BrokerFormData>({
    resolver: zodResolver(brokerSchema),
    defaultValues: {
      ghl_contact_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_name: '',
      state: '',
      primary_vertical: '',
      secondary_vertical: '',
      batch_size: undefined as unknown as number,
      deal_amount: undefined as unknown as number,
      ...defaultValues,
    },
  })

  async function onSubmit(data: BrokerFormData) {
    const result =
      mode === 'edit' && brokerId
        ? await updateBroker(brokerId, data)
        : await createBroker(data)

    if ('error' in result && result.error) {
      const errorObj = result.error as Record<string, string[]>
      if (errorObj._form) {
        toast.error(errorObj._form[0])
      } else {
        toast.error('Please fix the form errors')
      }
      return
    }

    toast.success(mode === 'edit' ? 'Broker updated' : 'Broker created')
    router.push('/brokers')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="ghl_contact_id">GHL Contact ID</Label>
        <Input id="ghl_contact_id" placeholder="abc123xyz" {...register('ghl_contact_id')} />
        {errors.ghl_contact_id && (
          <p className="text-sm text-destructive">{errors.ghl_contact_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">First Name</Label>
          <Input id="first_name" placeholder="John" {...register('first_name')} />
          {errors.first_name && (
            <p className="text-sm text-destructive">{errors.first_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="last_name">Last Name</Label>
          <Input id="last_name" placeholder="Smith" {...register('last_name')} />
          {errors.last_name && (
            <p className="text-sm text-destructive">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" placeholder="+17025551234" {...register('phone')} />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company_name">Company Name (optional)</Label>
        <Input id="company_name" placeholder="Smith Funding LLC" {...register('company_name')} />
        {errors.company_name && (
          <p className="text-sm text-destructive">{errors.company_name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="state">State (optional)</Label>
        <Input id="state" placeholder="NV" {...register('state')} />
        {errors.state && (
          <p className="text-sm text-destructive">{errors.state.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="primary_vertical">Primary Vertical (optional)</Label>
          <select
            id="primary_vertical"
            {...register('primary_vertical')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select...</option>
            {verticalOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          {errors.primary_vertical && (
            <p className="text-sm text-destructive">{errors.primary_vertical.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="secondary_vertical">Secondary Vertical (optional)</Label>
          <select
            id="secondary_vertical"
            {...register('secondary_vertical')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select...</option>
            {verticalOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          {errors.secondary_vertical && (
            <p className="text-sm text-destructive">{errors.secondary_vertical.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="batch_size">Batch Size</Label>
          <Input
            id="batch_size"
            type="number"
            placeholder="25"
            {...register('batch_size')}
          />
          {errors.batch_size && (
            <p className="text-sm text-destructive">{errors.batch_size.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deal_amount">Deal Amount ($)</Label>
          <Input
            id="deal_amount"
            type="number"
            step="0.01"
            placeholder="1500"
            {...register('deal_amount')}
          />
          {errors.deal_amount && (
            <p className="text-sm text-destructive">{errors.deal_amount.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/brokers" className={buttonVariants({ variant: 'outline' })}>
          Back
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Broker' : 'Create Broker'}
        </Button>
      </div>
    </form>
  )
}
