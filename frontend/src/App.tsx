import { useState, useEffect } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { LogOut, ShieldCheck, HeartHandshake, MapPin } from 'lucide-react'
import { DonatePage } from './components/DonatePage'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentView, setCurrentView] = useState<'home' | 'donate'>('home')
  const { toast } = useToast()

  useEffect(() => {
    const savedToken = localStorage.getItem('cleartrust_jwt')
    if (savedToken) {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLoginSuccess = async (credentialResponse: any) => {
    try {
      // In a real app, we would POST to the backend here:
      // const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      // const res = await fetch(`${apiBaseUrl}/auth/google`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token: credentialResponse.credential })
      // })
      // const data = await res.json()
      // const jwtToken = data.token

      // For Phase 1 frontend setup, we mock the JWT received:
      const jwtToken = `mock-jwt-token-for-${credentialResponse.credential?.substring(0, 10)}`
      
      localStorage.setItem('cleartrust_jwt', jwtToken)
      setIsAuthenticated(true)
      
      toast({
        title: "Authentication Successful",
        description: "Welcome to ClearTrust network.",
      })
    } catch (error) {
      console.error('Login failed:', error)
      toast({
        title: "Authentication Failed",
        description: "Could not connect to the backend server.",
        variant: "destructive"
      })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('cleartrust_jwt')
    setIsAuthenticated(false)
    setCurrentView('home')
    toast({
      title: "Logged Out",
      description: "You have been securely logged out.",
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <header className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-8 w-8 text-accent-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">ClearTrust</h1>
          </div>
          {isAuthenticated && (
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        {!isAuthenticated ? (
          <div className="max-w-md w-full space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-foreground">
                Transparent Aid.
              </h2>
              <p className="text-xl text-muted-foreground">
                Join the decentralized network for transparent, targeted disaster relief.
              </p>
            </div>
            
            <Card className="border-0 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-semibold">Sign In</CardTitle>
                <CardDescription>
                  Access the ClearTrust portal using your Google account
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center pt-6 pb-8">
                <div className="w-full max-w-[280px] flex justify-center">
                  <GoogleLogin
                    onSuccess={handleLoginSuccess}
                    onError={() => {
                      toast({
                        title: "Login Failed",
                        description: "Google authentication was unsuccessful.",
                        variant: "destructive"
                      })
                    }}
                    useOneTap
                    shape="pill"
                    theme="outline"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          currentView === 'home' ? (
            <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-full mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
                <p className="text-muted-foreground mt-2">
                  You are securely authenticated. Active JWT token is stored in your session.
                </p>
              </div>
              
              <Card className="shadow-lg border-slate-200 dark:border-slate-800 transition-all hover:shadow-xl">
                <CardHeader>
                  <HeartHandshake className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Donor Portal</CardTitle>
                  <CardDescription>Fund targeted aid packages</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 mb-6">Browse and fund active disaster relief packages for verified beneficiaries.</p>
                  <Button className="w-full" onClick={() => setCurrentView('donate')}>Explore Packages</Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-slate-200 dark:border-slate-800 transition-all hover:shadow-xl">
                <CardHeader>
                  <MapPin className="h-10 w-10 text-emerald-500 mb-2" />
                  <CardTitle>Field Intake</CardTitle>
                  <CardDescription>Register beneficiaries</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 mb-6">Onboard beneficiaries with Zero-Trust identity and issue QR vouchers.</p>
                  <Button variant="outline" className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50">Open Scanner</Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-slate-200 dark:border-slate-800 transition-all hover:shadow-xl">
                <CardHeader>
                  <ShieldCheck className="h-10 w-10 text-blue-500 mb-2" />
                  <CardTitle>Vendor POS</CardTitle>
                  <CardDescription>Redeem aid vouchers</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 mb-6">Scan beneficiary QR vouchers for real-time on-chain settlement.</p>
                  <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50">Launch POS</Button>
                </CardContent>
              </Card>
            </div>
          ) : currentView === 'donate' ? (
            <DonatePage onBack={() => setCurrentView('home')} token={localStorage.getItem('cleartrust_jwt')} />
          ) : null
        )}
      </main>
      <Toaster />
    </div>
  )
}
