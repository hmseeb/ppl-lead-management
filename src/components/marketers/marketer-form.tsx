'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { createMarketer, updateMarketer } from '@/lib/actions/marketers'

interface MarketerFormProps {
  marketer?: {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string | null
    status: string
  }
}

export function MarketerForm({ marketer }: MarketerFormProps) {
  const router = useRouter()
  const isEdit = !!marketer
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(marketer?.status ?? 'active')
  const closeRef = useRef<HTMLButtonElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      email: formData.get('email') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      phone: (formData.get('phone') as string) || undefined,
    }

    let result
    if (isEdit) {
      result = await updateMarketer(marketer.id, { ...data, status })
    } else {
      result = await createMarketer(data)
    }

    setSubmitting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(isEdit ? 'Marketer updated' : 'Marketer created')
      closeRef.current?.click()
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={marketer?.first_name ?? ''}
            required
            placeholder="John"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={marketer?.last_name ?? ''}
            required
            placeholder="Doe"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={marketer?.email ?? ''}
          required
          placeholder="john@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={marketer?.phone ?? ''}
          placeholder="(555) 123-4567"
        />
      </div>
      {isEdit && (
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => v && setStatus(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <DialogClose ref={closeRef} render={<button hidden />} />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  )
}
