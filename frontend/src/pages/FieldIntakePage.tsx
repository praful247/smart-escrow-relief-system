import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
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
        disasterZoneId: 'default_zone_001', // Placeholder for hackathon
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
      
      // The backend returns the inserted beneficiary which contains the proofOfHumanityHash
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
    <div className="flex-1 flex flex-col items-center p-4 sm:p-8 bg-slate-950 text-slate-50 w-full min-h-[calc(100vh-80px)]">
      <div className="max-w-md w-full">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-slate-400 hover:text-white hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Field Intake</h2>
            <p className="text-sm text-slate-400">Zero-Trust Registration</p>
          </div>
        </div>

        {successHash ? (
          /* SUCCESS VIEW - QR CODE */
          <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Registration Verified</h3>
            <p className="text-slate-400 text-sm mb-8">
              Scan this QR code at any verified vendor POS to redeem the aid voucher.
            </p>

            <div className="bg-white p-4 rounded-xl shadow-inner mb-8">
              <QRCodeSVG 
                value={successHash} 
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div className="text-xs font-mono text-slate-500 mb-8 break-all px-4 bg-slate-950 py-2 rounded border border-slate-800">
              {successHash}
            </div>

            <Button 
              onClick={handleReset} 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 text-lg"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Register Another Victim
            </Button>
          </div>
        ) : (
          /* FORM VIEW */
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <ShieldCheck className="h-12 w-12 text-blue-400" />
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Victim Name</label>
                <input 
                  type="text" 
                  required 
                  value={victimName} 
                  onChange={e => setVictimName(e.target.value)} 
                  className="flex h-12 w-full rounded-md border-2 border-slate-700 bg-slate-950 px-4 py-2 text-base text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500" 
                  placeholder="Full Legal Name" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Age</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={age} 
                    onChange={e => setAge(e.target.value)} 
                    className="flex h-12 w-full rounded-md border-2 border-slate-700 bg-slate-950 px-4 py-2 text-base text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500" 
                    placeholder="e.g. 45" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Family Size</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={familySize} 
                    onChange={e => setFamilySize(e.target.value)} 
                    className="flex h-12 w-full rounded-md border-2 border-slate-700 bg-slate-950 px-4 py-2 text-base text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500" 
                    placeholder="e.g. 4" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">Village / Location</label>
                <input 
                  type="text" 
                  required 
                  value={villageName} 
                  onChange={e => setVillageName(e.target.value)} 
                  className="flex h-12 w-full rounded-md border-2 border-slate-700 bg-slate-950 px-4 py-2 text-base text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500" 
                  placeholder="Current specific location" 
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 text-lg mt-6" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Proof...
                  </>
                ) : (
                  'Generate Identity Hash'
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
