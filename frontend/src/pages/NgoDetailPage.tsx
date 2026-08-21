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
    <div className="max-w-6xl w-full p-8">
      <Button variant="ghost" onClick={() => navigate('/explore')} className="mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to NGOs
      </Button>

      <div className="flex items-center gap-6 mb-10 pb-6 border-b border-slate-200 dark:border-slate-800">
        {ngo.avatarUrl ? (
          <img src={ngo.avatarUrl} alt={ngo.name} className="w-24 h-24 rounded-full object-cover shadow-sm border" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-4xl shadow-sm">
            {(ngo.organizationName || ngo.name).charAt(0)}
          </div>
        )}
        <div>
          <h2 className="text-4xl font-bold tracking-tight">{ngo.organizationName || ngo.name}</h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300">
              Verified NGO
            </span>
            <span className="text-sm text-slate-500 font-mono">
              Reg No: {ngo.registrationNumber || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-2xl font-semibold mb-2">Active Relief Packages</h3>
        <p className="text-muted-foreground">Select a package to fund. Your donation directly aids verified beneficiaries.</p>
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
  )
}
