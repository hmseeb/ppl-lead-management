import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewOrderPage() {
  return (
    <div className="space-y-6 pt-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Link
          href="/portal/orders"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">Create Order</h1>
      </div>
      <div className="rounded-lg border border-border p-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Order creation is temporarily unavailable while we set up payments.
        </p>
        <p className="text-xs text-muted-foreground">
          Contact your rep to place an order.
        </p>
      </div>
    </div>
  )
}
