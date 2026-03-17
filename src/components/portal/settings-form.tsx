'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings, Loader2, CheckCircle, Webhook, Mail, Phone, Clock, Globe } from 'lucide-react'
import { updateBrokerSettings } from '@/lib/actions/portal-self-service'
import {
  DELIVERY_METHOD_OPTIONS,
  TIMEZONE_OPTIONS,
  CONTACT_HOURS_OPTIONS,
} from '@/lib/schemas/broker'
import type { BrokerSettings } from '@/lib/portal/queries'

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

function deliveryMethodLabel(method: string) {
  switch (method) {
    case 'crm_webhook':
      return 'Webhook'
    case 'email':
      return 'Email'
    case 'sms':
      return 'SMS'
    default:
      return method
  }
}

function contactHoursLabel(hours: string) {
  switch (hours) {
    case 'anytime':
      return 'Anytime (24/7)'
    case 'business_hours':
      return 'Business Hours (9am-5pm)'
    case 'custom':
      return 'Custom Hours'
    default:
      return hours
  }
}

function timezoneLabel(tz: string) {
  switch (tz) {
    case 'America/New_York':
      return 'Eastern (ET)'
    case 'America/Chicago':
      return 'Central (CT)'
    case 'America/Denver':
      return 'Mountain (MT)'
    case 'America/Los_Angeles':
      return 'Pacific (PT)'
    case 'America/Phoenix':
      return 'Arizona (MST)'
    case 'America/Anchorage':
      return 'Alaska (AKT)'
    case 'Pacific/Honolulu':
      return 'Hawaii (HST)'
    default:
      return tz
  }
}

export function SettingsForm({ settings }: { settings: BrokerSettings | null }) {
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>(
    settings?.delivery_methods ?? ['crm_webhook']
  )
  const [webhookUrl, setWebhookUrl] = useState(settings?.crm_webhook_url ?? '')
  const [deliveryEmail, setDeliveryEmail] = useState(settings?.delivery_email ?? '')
  const [deliveryPhone, setDeliveryPhone] = useState(settings?.delivery_phone ?? '')
  const [contactHours, setContactHours] = useState(settings?.contact_hours ?? 'anytime')
  const [customStart, setCustomStart] = useState(settings?.custom_hours_start ?? '')
  const [customEnd, setCustomEnd] = useState(settings?.custom_hours_end ?? '')
  const [weekendPause, setWeekendPause] = useState(settings?.weekend_pause ?? false)
  const [timezone, setTimezone] = useState(settings?.timezone ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function toggleMethod(method: string) {
    setDeliveryMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    )
  }

  function handleSubmit() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateBrokerSettings({
        delivery_methods: deliveryMethods,
        crm_webhook_url: webhookUrl,
        delivery_email: deliveryEmail,
        delivery_phone: deliveryPhone,
        timezone,
        contact_hours: contactHours,
        custom_hours_start: customStart,
        custom_hours_end: customEnd,
        weekend_pause: weekendPause,
      })

      if (result?.error) {
        const err = result.error as Record<string, string[]>
        const formError = '_form' in err
          ? err._form?.[0]
          : Object.values(err).flat().join(', ')
        setError(formError || 'Validation failed')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Delivery Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="size-4 text-blue-400" />
            <CardTitle className="text-sm font-medium">Delivery Preferences</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Choose how you receive leads and configure your endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Delivery Methods */}
          <div className="space-y-2">
            <Label>Delivery Methods</Label>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_METHOD_OPTIONS.map((method) => {
                const active = deliveryMethods.includes(method)
                const Icon = method === 'crm_webhook' ? Webhook : method === 'email' ? Mail : Phone
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => toggleMethod(method)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? 'border-red-500/50 bg-red-500/10 text-red-400'
                        : 'border-border/50 text-muted-foreground hover:border-border'
                    }`}
                  >
                    <Icon className="size-3" />
                    {deliveryMethodLabel(method)}
                    {active && <CheckCircle className="size-3" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Webhook URL */}
          {deliveryMethods.includes('crm_webhook') && (
            <div className="space-y-2">
              <Label htmlFor="webhook_url">
                <Webhook className="size-3 inline mr-1" />
                Webhook URL
              </Label>
              <Input
                id="webhook_url"
                type="url"
                placeholder="https://your-crm.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
          )}

          {/* Delivery Email */}
          {deliveryMethods.includes('email') && (
            <div className="space-y-2">
              <Label htmlFor="delivery_email">
                <Mail className="size-3 inline mr-1" />
                Delivery Email
              </Label>
              <Input
                id="delivery_email"
                type="email"
                placeholder="leads@yourcompany.com"
                value={deliveryEmail}
                onChange={(e) => setDeliveryEmail(e.target.value)}
              />
            </div>
          )}

          {/* Delivery Phone */}
          {deliveryMethods.includes('sms') && (
            <div className="space-y-2">
              <Label htmlFor="delivery_phone">
                <Phone className="size-3 inline mr-1" />
                SMS Number
              </Label>
              <Input
                id="delivery_phone"
                type="tel"
                placeholder="+1 555 123 4567"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-amber-400" />
            <CardTitle className="text-sm font-medium">Contact Hours</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Set when leads should be delivered. Leads arriving outside hours will be queued.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">
              <Globe className="size-3 inline mr-1" />
              Timezone
            </Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={selectClassName}
            >
              <option value="">Select timezone...</option>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>{timezoneLabel(tz)}</option>
              ))}
            </select>
          </div>

          {/* Contact Hours */}
          <div className="space-y-2">
            <Label htmlFor="contact_hours">Contact Hours</Label>
            <select
              id="contact_hours"
              value={contactHours}
              onChange={(e) => setContactHours(e.target.value)}
              className={selectClassName}
            >
              {CONTACT_HOURS_OPTIONS.map((h) => (
                <option key={h} value={h}>{contactHoursLabel(h)}</option>
              ))}
            </select>
          </div>

          {/* Custom Hours */}
          {contactHours === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom_start">Start Time</Label>
                <Input
                  id="custom_start"
                  type="time"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom_end">End Time</Label>
                <Input
                  id="custom_end"
                  type="time"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Weekend Pause */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setWeekendPause(!weekendPause)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                weekendPause ? 'bg-red-500' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                  weekendPause ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <Label className="text-sm cursor-pointer" onClick={() => setWeekendPause(!weekendPause)}>
              Pause deliveries on weekends
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Error / Success */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-500">
          <CheckCircle className="size-4" />
          Settings saved successfully.
        </div>
      )}

      {/* Submit */}
      <Button type="submit" disabled={isPending || deliveryMethods.length === 0}>
        {isPending ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Settings'
        )}
      </Button>
    </form>
  )
}
