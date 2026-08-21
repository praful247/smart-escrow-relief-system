import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, PackagePlus, ArrowLeft, Package, Check, IndianRupee } from 'lucide-react'

export function NgoDashboardPackages() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [fetchingPackages, setFetchingPackages] = useState(true)
  const [packages, setPackages] = useState<any[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceInInr, setPriceInInr] = useState('')
  const [isCustomAmountAllowed, setIsCustomAmountAllowed] = useState(false)

  const token = localStorage.getItem('cleartrust_jwt')

  useEffect(() => {
    if (!token) {
      navigate('/')
      return
    }
    fetchPackages()
  }, [token, navigate])

  const fetchPackages = async () => {
    setFetchingPackages(true)
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiBaseUrl}/ngo/packages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setPackages(data.packages || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setFetchingPackages(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      
      const payload = {
        title,
        description,
        priceInInr: isCustomAmountAllowed ? 0 : Number(priceInInr), // if custom, base price can be 0 or a suggested amount
        isCustomAmountAllowed
      }

      // If custom amount is NOT allowed, we require a price
      if (!isCustomAmountAllowed && (!priceInInr || Number(priceInInr) < 1)) {
        toast({ title: "Validation Error", description: "Please enter a valid price.", variant: "destructive" })
        setLoading(false)
        return
      }

      const res = await fetch(`${apiBaseUrl}/ngo/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create package')
      }

      toast({
        title: "Package Created",
        description: "Your aid package is now live on the marketplace.",
      })
      
      // Reset form & refresh list
      setTitle('')
      setDescription('')
      setPriceInInr('')
      setIsCustomAmountAllowed(false)
      fetchPackages()

    } catch (err: any) {
      console.error(err)
      toast({
        title: "Error",
        description: err.message || "Failed to create package.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl w-full p-8">
      <Button variant="ghost" onClick={() => navigate('/ngo/dashboard')} className="mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Manage Packages</h2>
        <p className="text-muted-foreground mt-1">
          Create and monitor your relief packages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Create Package Column */}
        <div className="space-y-6">
          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardHeader>
              <PackagePlus className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Create New Package</CardTitle>
              <CardDescription>Define a specific relief goal for donors to fund.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Package Title</label>
                  <input 
                    type="text" 
                    required 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    placeholder="e.g. Emergency Food Ration" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                  <textarea 
                    required 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    placeholder="Describe what this package includes and who it helps..." 
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <input 
                    type="checkbox" 
                    id="customAmountToggle"
                    checked={isCustomAmountAllowed}
                    onChange={e => setIsCustomAmountAllowed(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="customAmountToggle" className="text-sm font-semibold cursor-pointer">
                      Allow Custom Donation Amount
                    </label>
                    <span className="text-xs text-muted-foreground">Donors can input their own funding amount for this package instead of a fixed price.</span>
                  </div>
                </div>

                {!isCustomAmountAllowed && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fixed Package Price (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 font-medium">₹</span>
                      <input 
                        type="number" 
                        required={!isCustomAmountAllowed} 
                        min="1"
                        value={priceInInr} 
                        onChange={e => setPriceInInr(e.target.value)} 
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                        placeholder="e.g. 1500" 
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full font-semibold" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Publish Package'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Existing Packages Column */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Your Packages</h3>
          </div>
          
          {fetchingPackages ? (
            <div className="flex justify-center items-center h-48 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-center p-6">
              <Package className="w-12 h-12 mb-2 text-slate-400" />
              <p>You haven't created any packages yet.</p>
              <p className="text-sm mt-1">Use the form to create your first one.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {packages.map(pkg => (
                <Card key={pkg.id} className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg">{pkg.title}</h4>
                      {pkg.isCustomAmountAllowed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full">
                          Custom Amt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full">
                          <IndianRupee className="w-3 h-3" /> {pkg.priceInInr}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                      {pkg.description}
                    </p>
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                      <Check className="w-3 h-3 mr-1 text-emerald-500" /> Live on Marketplace
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
