import { OrderForm } from '@/components/portal/order-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewOrderPage() {
  return (
    <div className="space-y-6 pt-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Link
          href="/portal"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">Create Order</h1>
      </div>
      <OrderForm />
    </div>
  )
}
