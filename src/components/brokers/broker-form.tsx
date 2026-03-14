'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  brokerSchema,
  verticalOptions,
  DELIVERY_METHOD_OPTIONS,
  TIMEZONE_OPTIONS,
  CONTACT_HOURS_OPTIONS,
  ASSIGNMENT_STATUS_OPTIONS,
  type BrokerFormData,
} from '@/lib/schemas/broker'
import { createBroker, updateBroker } from '@/lib/actions/brokers'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

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
    watch,
    control,
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
      delivery_methods: ['crm_webhook'],
      crm_webhook_url: '',
      timezone: '',
      contact_hours: 'anytime',
      custom_hours_start: '',
      custom_hours_end: '',
      weekend_pause: false,
      assignment_status: 'active',
      ...defaultValues,
    },
  })

  const deliveryMethods = watch('delivery_methods') ?? []
  const contactHours = watch('contact_hours')
  const webhookUrl = watch('crm_webhook_url')
  const [sendingTest, setSendingTest] = useState(false)

  async function handleTestWebhook() {
    if (!brokerId) return
    setSendingTest(true)
    try {
      const res = await fetch(`/api/brokers/${brokerId}/test-webhook`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Webhook responded with ${data.status_code}`)
      } else {
        toast.error(data.error || 'Test failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSendingTest(false)
    }
  }

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-md">
      {/* Basic Info */}
      <fieldset className="space-y-4">
        <legend className="text-base font-medium text-foreground">Basic Info</legend>

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
            <select id="primary_vertical" {...register('primary_vertical')} className={selectClass}>
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
            <select id="secondary_vertical" {...register('secondary_vertical')} className={selectClass}>
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
            <Input id="batch_size" type="number" placeholder="25" {...register('batch_size')} />
            {errors.batch_size && (
              <p className="text-sm text-destructive">{errors.batch_size.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal_amount">Deal Amount ($)</Label>
            <Input id="deal_amount" type="number" step="0.01" placeholder="1500" {...register('deal_amount')} />
            {errors.deal_amount && (
              <p className="text-sm text-destructive">{errors.deal_amount.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Operational Settings */}
      <fieldset className="space-y-4 border-t pt-6">
        <legend className="text-base font-medium text-foreground">Operational Settings</legend>

        <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Contact hours and weekend delivery pause are currently disabled system-wide. All leads are delivered immediately regardless of these settings.
        </div>

        {/* Delivery Methods */}
        <div className="space-y-2">
          <Label>Delivery Methods</Label>
          <Controller
            control={control}
            name="delivery_methods"
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {DELIVERY_METHOD_OPTIONS.map((method) => {
                  const checked = (field.value ?? []).includes(method)
                  return (
                    <label key={method} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const current = field.value ?? []
                          if (e.target.checked) {
                            field.onChange([...current, method])
                          } else {
                            field.onChange(current.filter((m) => m !== method))
                          }
                        }}
                        className="size-4 rounded border border-input accent-primary"
                      />
                      <span className="capitalize">{method.replace('_', ' ')}</span>
                    </label>
                  )
                })}
              </div>
            )}
          />
          {errors.delivery_methods && (
            <p className="text-sm text-destructive">{errors.delivery_methods.message}</p>
          )}
        </div>

        {/* CRM Webhook URL - only when crm_webhook selected */}
        {deliveryMethods.includes('crm_webhook') && (
          <div className="space-y-1.5">
            <Label htmlFor="crm_webhook_url">CRM Webhook URL</Label>
            <Input
              id="crm_webhook_url"
              type="url"
              placeholder="https://hooks.example.com/webhook"
              {...register('crm_webhook_url')}
            />
            {errors.crm_webhook_url && (
              <p className="text-sm text-destructive">{errors.crm_webhook_url.message}</p>
            )}
            {mode === 'edit' && brokerId && webhookUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sendingTest}
                onClick={handleTestWebhook}
                className="mt-1"
              >
                {sendingTest ? 'Sending...' : 'Send Test Payload'}
              </Button>
            )}
          </div>
        )}

        {/* Timezone */}
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <select id="timezone" {...register('timezone')} className={selectClass}>
            <option value="">Default (America/Los_Angeles)</option>
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
            ))}
          </select>
          {errors.timezone && (
            <p className="text-sm text-destructive">{errors.timezone.message}</p>
          )}
        </div>

        {/* Contact Hours */}
        <div className="space-y-1.5">
          <Label htmlFor="contact_hours">Contact Hours</Label>
          <select id="contact_hours" {...register('contact_hours')} className={selectClass}>
            {CONTACT_HOURS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'anytime' ? 'Anytime' : opt === 'business_hours' ? 'Business Hours (9-5)' : 'Custom'}
              </option>
            ))}
          </select>
          {errors.contact_hours && (
            <p className="text-sm text-destructive">{errors.contact_hours.message}</p>
          )}
        </div>

        {/* Custom Hours - only when contact_hours = custom */}
        {contactHours === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="custom_hours_start">Start Time</Label>
              <Input
                id="custom_hours_start"
                type="time"
                {...register('custom_hours_start')}
              />
              {errors.custom_hours_start && (
                <p className="text-sm text-destructive">{errors.custom_hours_start.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom_hours_end">End Time</Label>
              <Input
                id="custom_hours_end"
                type="time"
                {...register('custom_hours_end')}
              />
              {errors.custom_hours_end && (
                <p className="text-sm text-destructive">{errors.custom_hours_end.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Weekend Pause */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              {...register('weekend_pause')}
              className="size-4 rounded border border-input accent-primary"
            />
            <span>Pause deliveries on weekends</span>
          </label>
          {errors.weekend_pause && (
            <p className="text-sm text-destructive">{errors.weekend_pause.message}</p>
          )}
        </div>

        {/* Assignment Status */}
        <div className="space-y-1.5">
          <Label htmlFor="assignment_status">Assignment Status</Label>
          <select id="assignment_status" {...register('assignment_status')} className={selectClass}>
            {ASSIGNMENT_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="capitalize">
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
          {errors.assignment_status && (
            <p className="text-sm text-destructive">{errors.assignment_status.message}</p>
          )}
        </div>
      </fieldset>

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
