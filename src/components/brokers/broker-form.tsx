'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { brokerSchema, type BrokerFormData } from '@/lib/schemas/broker'
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
      name: '',
      company: '',
      email: '',
      phone: '',
      crm_webhook_url: '',
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
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="John Doe" {...register('name')} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company">Company (optional)</Label>
        <Input id="company" placeholder="Acme Corp" {...register('company')} />
        {errors.company && (
          <p className="text-sm text-destructive">{errors.company.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" placeholder="+1 555-1234" {...register('phone')} />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="crm_webhook_url">GHL Webhook URL</Label>
        <Input
          id="crm_webhook_url"
          placeholder="https://services.leadconnectorhq.com/hooks/..."
          {...register('crm_webhook_url')}
        />
        {errors.crm_webhook_url && (
          <p className="text-sm text-destructive">{errors.crm_webhook_url.message}</p>
        )}
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
