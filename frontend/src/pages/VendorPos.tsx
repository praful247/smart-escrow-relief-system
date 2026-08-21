import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck } from 'lucide-react'

export function VendorPos() {
  return (
    <div className="max-w-6xl w-full p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Vendor POS</h2>
        <p className="text-muted-foreground mt-1">Redeem aid vouchers and claim settlements.</p>
      </div>

      <Card className="shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader>
          <ShieldCheck className="h-10 w-10 text-blue-500 mb-2" />
          <CardTitle>Vendor POS Scanner</CardTitle>
          <CardDescription>Scan QR vouchers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-6">Scan beneficiary QR vouchers for real-time on-chain settlement.</p>
          <button className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-blue-200 bg-transparent text-blue-600 shadow-sm hover:bg-blue-50 h-9 px-4 py-2">
            Launch POS
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
