import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export default function OrderSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <CheckCircle className="size-12 text-green-500" />
          </div>
          <CardTitle>Payment Successful</CardTitle>
          <CardDescription>
            Your lead order has been created and is now active.
            Leads matching your criteria will be delivered automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/portal/orders/new">
            <Button variant="outline" className="w-full">
              Create Another Order
            </Button>
          </Link>
          <Link href="/portal">
            <Button variant="ghost" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
