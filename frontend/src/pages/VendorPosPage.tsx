import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, ShieldCheck, Camera, MapPin, CheckCircle2, XCircle } from 'lucide-react'

export function VendorPosPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [redemptionStatus, setRedemptionStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE')
  const [errorMessage, setErrorMessage] = useState('')
  
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationError, setLocationError] = useState('')

  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const token = localStorage.getItem('cleartrust_jwt')

  useEffect(() => {
    if (!token) {
      navigate('/')
      return
    }

    // Capture Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude)
          setLongitude(position.coords.longitude)
        },
        (err) => {
          console.error("Geolocation error:", err)
          setLocationError("Failed to get location. Please enable GPS permissions.")
          toast({
            title: "Location Required",
            description: "GPS coordinates are required to redeem vouchers.",
            variant: "destructive"
          })
        },
        { enableHighAccuracy: true }
      )
    } else {
      setLocationError("Geolocation is not supported by this browser.")
    }
  }, [token, navigate, toast])

  useEffect(() => {
    let isMounted = true;
    let scanner: Html5QrcodeScanner | null = null;

    const startScanner = async () => {
      // Small delay to ensure the div is painted and previous instances are fully cleared in StrictMode
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isMounted || scanResult || document.getElementById('qr-reader-scan-region')) return;

      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scanner.render(
        (decodedText) => {
          if (isMounted) {
            setScanResult(decodedText);
            scanner?.clear().catch(console.error);
          }
        },
        () => {}
      );
    };

    if (!scanResult) {
      startScanner();
    }

    return () => {
      isMounted = false;
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scanResult]);

  useEffect(() => {
    if (scanResult) {
      handleRedeem(scanResult)
    }
  }, [scanResult])

  const handleRedeem = async (voucherHash: string) => {
    if (!latitude || !longitude) {
      setRedemptionStatus('ERROR')
      setErrorMessage("Cannot redeem without GPS coordinates. Please enable location services.")
      return
    }

    setLoading(true)
    setRedemptionStatus('IDLE')

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      
      const payload = {
        voucherHash: voucherHash.trim(),
        latitude,
        longitude
      }

      const res = await fetch(`${apiBaseUrl}/vouchers/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to redeem voucher')
      }

      setRedemptionStatus('SUCCESS')
      toast({
        title: "Voucher Redeemed!",
        description: "Funds will be settled to your account shortly.",
      })
      
    } catch (err: any) {
      console.error(err)
      setRedemptionStatus('ERROR')
      setErrorMessage(err.message || "An unexpected error occurred.")
      toast({
        title: "Redemption Failed",
        description: err.message || "Failed to redeem voucher.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetScanner = () => {
    setScanResult(null)
    setRedemptionStatus('IDLE')
    setErrorMessage('')
  }

  return (
    <div className="max-w-4xl w-full p-8">
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" /> Exit POS
      </Button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Vendor POS</h2>
        <p className="text-muted-foreground mt-1">Scan zero-trust QR vouchers to dispense aid.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Scanner Area */}
        <div className="md:col-span-2">
          <Card className="shadow-lg border-slate-200 dark:border-slate-800 overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary" />
                    QR Scanner
                  </CardTitle>
                  <CardDescription>Position the beneficiary's QR code within the frame.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col items-center justify-center bg-slate-950 min-h-[400px]">
              
              {!scanResult && !locationError && (
                <div className="w-full max-w-sm flex flex-col items-center gap-4">
                  <div id="qr-reader" className="w-full overflow-hidden rounded-lg bg-black"></div>
                  
                  {/* Fallback for testing */}
                  <div className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Manual Override</p>
                      <button 
                        onClick={() => {
                          const input = document.getElementById('manual-hash') as HTMLInputElement;
                          if (input) input.value = 'f614ab7f93de0761478d8bf98c0d46fbadd047083d44dd7beb0a3f0db66cf4f6';
                        }}
                        className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700 transition"
                      >
                        Auto-Fill Test Hash
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        id="manual-hash"
                        placeholder="Paste Voucher Hash..."
                        className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-emerald-500"
                      />
                      <Button 
                        onClick={() => {
                          const val = (document.getElementById('manual-hash') as HTMLInputElement)?.value;
                          if (val) setScanResult(val.trim());
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Simulate
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {locationError && (
                <div className="text-center p-8 text-slate-300">
                  <MapPin className="w-12 h-12 mx-auto text-red-500 mb-4" />
                  <p className="font-semibold text-lg text-white">Location Services Required</p>
                  <p className="text-sm mt-2">{locationError}</p>
                </div>
              )}

              {scanResult && (
                <div className="text-center p-8 w-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                  {loading ? (
                    <>
                      <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-6" />
                      <h3 className="text-xl font-bold text-white">Verifying Voucher...</h3>
                      <p className="text-slate-400 mt-2">Checking on-chain records and location logic.</p>
                    </>
                  ) : redemptionStatus === 'SUCCESS' ? (
                    <>
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
                      <p className="text-emerald-400 mb-8">Voucher successfully redeemed.</p>
                      <Button onClick={resetScanner} size="lg" className="font-bold">
                        Scan Next Voucher
                      </Button>
                    </>
                  ) : redemptionStatus === 'ERROR' ? (
                    <>
                      <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                        <XCircle className="h-12 w-12 text-red-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Redemption Failed</h3>
                      <p className="text-red-400 mb-8 max-w-sm">{errorMessage}</p>
                      <Button onClick={resetScanner} variant="destructive" size="lg" className="font-bold">
                        Try Again
                      </Button>
                    </>
                  ) : null}
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Status */}
        <div className="space-y-6">
          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg">POS Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-sm">System</span>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">ONLINE</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                <div className="flex items-center gap-3">
                  <MapPin className={`w-5 h-5 ${latitude ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="font-medium text-sm">GPS Fix</span>
                </div>
                {latitude ? (
                  <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">SECURE</span>
                ) : (
                  <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-full">WAITING</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
