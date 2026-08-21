import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, PackagePlus, BarChart3, Users, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NgoDashboard() {
  const navigate = useNavigate()
  
  return (
    <div className="max-w-6xl w-full p-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-foreground">
            NGO Command Center
          </h2>
          <p className="text-lg text-muted-foreground mt-2 max-w-2xl">
            Manage your relief packages, track decentralized funds, and oversee disaster zones from one central hub.
          </p>
        </div>
      </div>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Manage Packages */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <PackagePlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Aid Packages</CardTitle>
            <CardDescription>Create and publish relief packages for the donor marketplace.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">
              Define specific relief goals, set pricing, and allow donors to fund crucial supplies like food rations, medical kits, or shelter.
            </p>
            <Button 
              onClick={() => navigate('/ngo/packages')}
              className="w-full gap-2 font-semibold"
            >
              Manage Packages <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Analytics & Ledger */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-blue-500" />
            </div>
            <CardTitle className="text-xl">Analytics & Ledger</CardTitle>
            <CardDescription>Track blockchain settlements and impact KPIs.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">
              View real-time data on funds raised, voucher redemption rates, and active field workers. Total transparency built-in.
            </p>
            <Button 
              onClick={() => navigate('/ngo/analytics')}
              variant="outline"
              className="w-full gap-2 font-semibold border-blue-200 hover:bg-blue-50 text-blue-700 dark:border-blue-900 dark:hover:bg-blue-950 dark:text-blue-400"
            >
              View Analytics <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Disaster Zones (Placeholder) */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-amber-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                Coming Soon
              </span>
            </div>
            <CardTitle className="text-xl text-slate-700 dark:text-slate-300">Disaster Zones</CardTitle>
            <CardDescription>Geo-fence your relief operations.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 line-clamp-2">
              Draw geofences on a map to restrict where vouchers can be redeemed and track active field workers via GPS.
            </p>
            <Button 
              disabled
              variant="secondary"
              className="w-full gap-2"
            >
              <Users className="w-4 h-4" /> Manage Zones & Workers
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
