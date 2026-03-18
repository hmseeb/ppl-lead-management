import { OrderForm } from '@/components/portal/order-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewOrderPage({ searchParams }: Props) {
  const params = await searchParams
  const reorderVertical = typeof params?.reorder_vertical === 'string' ? params.reorder_vertical : undefined
  const reorderCredit = typeof params?.reorder_credit === 'string' ? params.reorder_credit : undefined
  const reorderCount = typeof params?.reorder_count === 'string' ? params.reorder_count : undefined
  const isReorder = !!(reorderVertical || reorderCredit || reorderCount)

  return (
    <div className="space-y-6 pt-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Link
          href="/portal/orders"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-semibold">
          {isReorder ? 'Reorder' : 'Create Order'}
        </h1>
      </div>
      <OrderForm
        defaultVertical={reorderVertical}
        defaultCreditTier={reorderCredit}
        defaultLeadCount={reorderCount}
      />
    </div>
  )
}
