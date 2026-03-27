'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'

interface MarketerTokenDisplayProps {
  token: string
}

export function MarketerTokenDisplay({ token }: MarketerTokenDisplayProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(token)
    toast.success('Token copied')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <h3 className="text-sm font-medium">Your API Token</h3>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={token}
          className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-xs"
        />
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Use this token as a Bearer token in the Authorization header when posting leads to the API.
      </p>
    </div>
  )
}
