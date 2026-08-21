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
    <div className="max-w-6xl w-full p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">NGO Marketplace</h2>
        <p className="text-muted-foreground mt-1">
          Discover verified NGOs and fund their disaster relief packages directly on-chain.
        </p>
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
  )
}
