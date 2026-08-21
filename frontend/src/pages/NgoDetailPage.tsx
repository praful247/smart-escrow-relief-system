import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'

// Extended Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any
  }
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

interface AidPackage {
  id: string
  title: string
  description: string
  priceInInr: number
  isCustomAmountAllowed: boolean
}


interface NgoDetails {
  id: string
  name: string
  organizationName?: string
  registrationNumber?: string
  avatarUrl?: string
}

export function NgoDetailPage() {
  const { id: ngoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [ngo, setNgo] = useState<NgoDetails | null>(null)
  const [packages, setPackages] = useState<AidPackage[]>([])
  const [loading, setLoading] = useState(true)
  
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null)
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: string }>({})

  const token = localStorage.getItem('cleartrust_jwt')

  useEffect(() => {
    const fetchNgoDetails = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiBaseUrl}/ngos/${ngoId}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error('NGO not found')
          throw new Error('Failed to fetch NGO details')
        }
        
        const data = await res.json()
        setNgo(data.ngo)
        setPackages(data.packages || [])
      } catch (err: any) {
        console.error(err)
        toast({
          title: "Error",
          description: err.message || "Could not load NGO details.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (ngoId) {
      fetchNgoDetails()
    }
  }, [ngoId, toast])

  const handleCustomAmountChange = (pkgId: string, val: string) => {
    setCustomAmounts(prev => ({ ...prev, [pkgId]: val }))
  }

  const handleDonate = async (pkg: AidPackage) => {
    if (!token) {
      toast({ title: "Authentication Required", description: "Please log in first.", variant: "destructive" })
      return
    }

    let finalAmount = pkg.priceInInr
    if (pkg.isCustomAmountAllowed) {
      const customVal = customAmounts[pkg.id]
      if (!customVal || isNaN(Number(customVal)) || Number(customVal) < 1) {
        toast({ title: "Invalid Amount", description: "Please enter a valid custom amount in INR.", variant: "destructive" })
        return
      }
      finalAmount = Number(customVal)
    }

    setLoadingPackageId(pkg.id)

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      
      // Step 1: Create Razorpay Order
      const payload: any = { packageId: pkg.id, amountInInr: finalAmount }
      if (pkg.isCustomAmountAllowed) {
        payload.customAmount = finalAmount
      }

      const orderRes = await fetch(`${apiBaseUrl}/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      
      if (!orderRes.ok) throw new Error('Failed to create order')
      const orderData = await orderRes.json()

      // Step 2: Initialize Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mock',
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'ClearTrust Relief',
        description: `Donation for ${pkg.title}`,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // Step 3: Verify Payment Signature
            const verifyRes = await fetch(`${apiBaseUrl}/payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
            })
            
            if (!verifyRes.ok) throw new Error('Payment verification failed')

            toast({
              title: "Donation Successful!",
              description: `Thank you for funding the ${pkg.title}. A voucher will be securely generated.`,
            })
          } catch (err) {
            console.error(err)
            toast({
              title: "Verification Failed",
              description: "There was an error verifying your payment.",
              variant: "destructive"
            })
          }
        },
        theme: { color: "#0f172a" },
        modal: {
          ondismiss: function() {
            toast({ title: "Payment Cancelled", description: "You closed the payment window.", variant: "destructive" });
          }
        }
      }

      const isLoaded = await loadRazorpayScript()
      if (!isLoaded) {
        toast({ title: "Error", description: "Failed to load Razorpay SDK", variant: "destructive" })
        return
      }

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', function (response: any) {
          toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" })
        })
        rzp.open()
      } else {
        throw new Error('Razorpay SDK not loaded')
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initiate donation process.",
        variant: "destructive"
      })
    } finally {
      setLoadingPackageId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!ngo) {
    return (
      <div className="max-w-6xl w-full p-8 text-center">
        <h2 className="text-2xl font-bold">NGO Not Found</h2>
        <Button variant="link" onClick={() => navigate('/explore')}>Return to Marketplace</Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Cover Image */}
      <div className="w-full h-64 md:h-80 bg-slate-900 relative">
        <img 
          src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2070&auto=format&fit=crop" 
          alt="NGO Cover" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute top-8 left-8">
          <Button variant="secondary" onClick={() => navigate('/explore')} className="gap-2 shadow-lg backdrop-blur-md bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-8 pb-16">
        {/* NGO Header Profile */}
        <div className="relative -mt-16 sm:-mt-24 mb-12 flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          {ngo.avatarUrl ? (
            <img src={ngo.avatarUrl} alt={ngo.name} className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover shadow-xl border-4 border-white dark:border-slate-950 bg-white" />
          ) : (
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-5xl shadow-xl border-4 border-white dark:border-slate-950">
              {(ngo.organizationName || ngo.name).charAt(0)}
            </div>
          )}
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-sm">{ngo.organizationName || ngo.name}</h2>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-3">
              <span className="text-sm font-semibold px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Verified NGO
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400 font-mono px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                Reg No: {ngo.registrationNumber || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold">About Our Mission</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
              We are a dedicated non-profit organization focused on providing immediate, transparent, and direct disaster relief to vulnerable communities. With the power of the ClearTrust platform, we guarantee that 100% of your contributions are locked on the blockchain and only released when our verified field workers physically deliver the essential relief packages to those in need.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
              Join us in rebuilding lives. Explore our active campaigns below and make an impact today.
            </p>
          </div>
          <div className="col-span-1">
            <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-none">
              <CardHeader>
                <CardTitle className="text-lg">Recent Impact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">Total Funds Raised</span>
                  <span className="font-semibold text-primary">₹1,450,000</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">Families Supported</span>
                  <span className="font-semibold text-primary">3,200+</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-slate-500">Active Volunteers</span>
                  <span className="font-semibold text-primary">150</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-3xl font-extrabold mb-2">Active Relief Packages</h3>
          <p className="text-lg text-muted-foreground">Select a package to fund. Your donation directly aids verified beneficiaries.</p>
        </div>

      {packages.length === 0 ? (
        <Card className="p-8 text-center bg-slate-50 dark:bg-slate-900 border-dashed">
          <h3 className="text-xl font-semibold mb-2">No Packages Available</h3>
          <p className="text-muted-foreground">This NGO has not created any aid packages yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="flex flex-col shadow-lg border-slate-200 dark:border-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
              <CardHeader>
                <CardTitle>{pkg.title}</CardTitle>
                <CardDescription className="text-lg font-semibold text-primary mt-2">
                  {pkg.isCustomAmountAllowed ? 'Custom Amount' : `₹${pkg.priceInInr.toLocaleString('en-IN')}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pkg.description}
                </p>
                
                {pkg.isCustomAmountAllowed && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-xs font-semibold uppercase text-slate-500">Donation Amount (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 font-medium">₹</span>
                      <input 
                        type="number" 
                        min="1"
                        placeholder="e.g. 1000"
                        value={customAmounts[pkg.id] || ''}
                        onChange={(e) => handleCustomAmountChange(pkg.id, e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full font-semibold"
                  onClick={() => handleDonate(pkg)}
                  disabled={loadingPackageId === pkg.id}
                >
                  {loadingPackageId === pkg.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    pkg.isCustomAmountAllowed ? 'Donate Custom Amount' : 'Fund Package'
                  )}
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
