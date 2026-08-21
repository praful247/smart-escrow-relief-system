import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'

export function NgoDashboard() {
  return (
    <div className="max-w-6xl w-full p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">NGO Dashboard</h2>
        <p className="text-muted-foreground mt-1">Field Intake and Beneficiary Registration.</p>
      </div>

      <Card className="shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader>
          <MapPin className="h-10 w-10 text-emerald-500 mb-2" />
          <CardTitle>Field Intake</CardTitle>
          <CardDescription>Register beneficiaries</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-6">Onboard beneficiaries with Zero-Trust identity and issue QR vouchers.</p>
          <button className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-emerald-200 bg-transparent text-emerald-600 shadow-sm hover:bg-emerald-50 h-9 px-4 py-2">
            Open Scanner
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
