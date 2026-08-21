import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Globe, FileText } from 'lucide-react'

interface Ngo {
  id: string
  name: string
  email: string
  avatarUrl?: string
  organizationName?: string
  registrationNumber?: string
}

export function ExploreNgosPage() {
  const [ngos, setNgos] = useState<Ngo[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchNgos = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiBaseUrl}/ngos`)
        if (!res.ok) throw new Error('Failed to fetch NGOs')
        
        const data = await res.json()
        setNgos(data.ngos || [])
      } catch (err) {
        console.error(err)
        toast({
          title: "Error",
          description: "Could not load NGOs. Please try again later.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchNgos()
  }, [toast])

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="bg-slate-900 text-white py-20 px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=2070&auto=format&fit=crop" 
            alt="Disaster Relief Hero" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            Support Verified Relief Efforts
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mb-8">
            Browse our network of vetted NGOs. Your donations are locked on the blockchain and released only when a registered vendor physically hands over the relief package to a verified victim.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-white">$1.2M+</div>
              <div className="text-sm text-slate-300">Funds Protected</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-white">45,000+</div>
              <div className="text-sm text-slate-300">Families Helped</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-white">100%</div>
              <div className="text-sm text-slate-300">On-Chain Transparency</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <div className="text-3xl font-bold text-white">12</div>
              <div className="text-sm text-slate-300">Active Disaster Zones</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full p-8 mt-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Active Campaigns</h2>
            <p className="text-muted-foreground mt-1">
              Select an NGO below to view their active aid packages.
            </p>
          </div>
        </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : ngos.length === 0 ? (
        <Card className="p-8 text-center bg-slate-50 dark:bg-slate-900 border-dashed">
          <Globe className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No NGOs Found</h3>
          <p className="text-muted-foreground">There are currently no verified NGOs on the platform.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ngos.map((ngo) => (
            <Card key={ngo.id} className="flex flex-col shadow-sm hover:shadow-lg transition-all border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center gap-4">
                  {ngo.avatarUrl ? (
                    <img src={ngo.avatarUrl} alt={ngo.name || 'NGO'} className="w-12 h-12 rounded-full object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                      {(ngo.organizationName || ngo.name || 'NGO').charAt(0)}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-xl">{ngo.organizationName || ngo.name || 'Verified NGO'}</CardTitle>
                    <CardDescription className="text-xs font-mono mt-1 text-slate-500">
                      Reg: {ngo.registrationNumber || 'N/A'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Join us in providing essential disaster relief. View our active packages to contribute directly to verified beneficiaries.
                </p>
              </CardContent>
              <CardFooter className="pt-4 border-t">
                <Button 
                  className="w-full gap-2" 
                  onClick={() => navigate(`/ngo/${ngo.id}`)}
                >
                  <FileText className="w-4 h-4" />
                  View Packages
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
