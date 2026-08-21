import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, UserPlus, ShieldCheck, CheckCircle2 } from 'lucide-react'

export function FieldIntakePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [successHash, setSuccessHash] = useState<string | null>(null)
  
  // Form State
  const [victimName, setVictimName] = useState('')
  const [age, setAge] = useState('')
  const [familySize, setFamilySize] = useState('1')
  const [villageName, setVillageName] = useState('')

  const token = localStorage.getItem('cleartrust_jwt')

  useEffect(() => {
    if (!token) {
      navigate('/')
    }
  }, [token, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      
      const payload = {
        disasterZoneId: '11111111-1111-1111-1111-111111111111', // Valid UUID placeholder
        identityData: {
          name: victimName,
          age: Number(age),
          familySize: Number(familySize),
          village: villageName
        }
      }

      const res = await fetch(`${apiBaseUrl}/beneficiaries/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Registration failed')
      }

      const data = await res.json()
      
      toast({
        title: "Registration Successful",
        description: "Beneficiary registered securely on-chain.",
      })
      
      if (data.beneficiary && data.beneficiary.proofOfHumanityHash) {
        setSuccessHash(data.beneficiary.proofOfHumanityHash)
      } else {
        throw new Error("Missing voucher hash from server response")
      }

    } catch (err: any) {
      console.error(err)
      toast({
        title: "Error",
        description: err.message || "Failed to register beneficiary.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSuccessHash(null)
    setVictimName('')
    setAge('')
    setFamilySize('1')
    setVillageName('')
  }

  return (
    <div className="max-w-4xl w-full p-8">
      <Button variant="ghost" onClick={() => navigate('/ngo/dashboard')} className="mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Field Intake</h2>
        <p className="text-muted-foreground mt-1">Zero-Trust Registration</p>
      </div>

      <Card className="shadow-lg border-slate-200 dark:border-slate-800">
        {successHash ? (
          <>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Registration Verified</CardTitle>
              <CardDescription>
                Scan this QR code at any verified vendor POS to redeem the aid voucher.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-6">
              <div className="bg-white p-4 rounded-xl shadow-inner mb-6">
                <QRCodeSVG 
                  value={successHash} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <div className="text-xs font-mono text-slate-500 mb-8 break-all px-4 bg-slate-100 dark:bg-slate-900 py-2 rounded border border-slate-200 dark:border-slate-800 text-center max-w-full">
                {successHash}
              </div>

              <Button 
                onClick={handleReset} 
                className="w-full sm:w-auto font-semibold gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Register Another Victim
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <ShieldCheck className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Register Beneficiary</CardTitle>
              <CardDescription>Collect identity data to generate a cryptographic voucher hash.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Victim Name</label>
                  <input 
                    type="text" 
                    required 
                    value={victimName} 
                    onChange={e => setVictimName(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    placeholder="Full Legal Name" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      value={age} 
                      onChange={e => setAge(e.target.value)} 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                      placeholder="e.g. 45" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Family Size</label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      value={familySize} 
                      onChange={e => setFamilySize(e.target.value)} 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                      placeholder="e.g. 4" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Village / Location</label>
                  <input 
                    type="text" 
                    required 
                    value={villageName} 
                    onChange={e => setVillageName(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                    placeholder="Current specific location" 
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full font-semibold mt-6" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Proof...
                    </>
                  ) : (
                    'Generate Identity Hash'
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
