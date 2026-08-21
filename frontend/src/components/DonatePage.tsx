import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'

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
}

const MOCK_PACKAGES: AidPackage[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Emergency Food Ration',
    description: 'Provides a family of four with basic food supplies (rice, lentils, cooking oil, etc.) for a week.',
    priceInInr: 1500,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'Medical Supply Kit',
    description: 'Includes first-aid essentials, water purification tablets, and basic non-prescription medicines.',
    priceInInr: 2500,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: 'Temporary Shelter Kit',
    description: 'Provides tarpaulins, ropes, and thermal blankets to secure emergency shelter.',
    priceInInr: 5000,
  }
]

interface DonatePageProps {
  onBack: () => void
  token: string | null
}

export function DonatePage({ onBack, token }: DonatePageProps) {
  const { toast } = useToast()
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null)

  const handleDonate = async (pkg: AidPackage) => {
    if (!token) {
      toast({ title: "Authentication Required", description: "Please log in first.", variant: "destructive" })
      return
    }

    setLoadingPackageId(pkg.id)

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      
      // Step 1: Create Razorpay Order
      const orderRes = await fetch(`${apiBaseUrl}/payment/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ packageId: pkg.id, amountInInr: pkg.priceInInr })
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
              description: `Thank you for funding the ${pkg.title}. A voucher will be securely generated for beneficiaries on-chain.`,
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
        prefill: {
          name: "Anonymous Donor",
          email: "donor@example.com",
          contact: "9999999999"
        },
        theme: {
          color: "#0f172a" // slate-900
        }
      }

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', function (response: any) {
          toast({
            title: "Payment Failed",
            description: response.error.description,
            variant: "destructive"
          })
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

  return (
    <div className="max-w-6xl w-full">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Donor Portal</h2>
          <p className="text-muted-foreground mt-1">Select an aid package to fund. Your donation generates a traceable voucher for a verified beneficiary.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MOCK_PACKAGES.map((pkg) => (
          <Card key={pkg.id} className="flex flex-col shadow-lg border-slate-200 dark:border-slate-800 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
            <CardHeader>
              <CardTitle>{pkg.title}</CardTitle>
              <CardDescription className="text-lg font-semibold text-primary mt-2">
                ₹{pkg.priceInInr.toLocaleString('en-IN')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {pkg.description}
              </p>
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
                  'Fund Package'
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
