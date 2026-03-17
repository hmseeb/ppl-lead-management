import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { XCircle } from 'lucide-react'

export default function OrderCancelPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <XCircle className="size-12 text-muted-foreground" />
          </div>
          <CardTitle>Checkout Cancelled</CardTitle>
          <CardDescription>
            Your payment was not completed. No order has been created.
            You can try again whenever you are ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/portal/orders/new">
            <Button className="w-full">
              Try Again
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
