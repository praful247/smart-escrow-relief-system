import { useNavigate, Navigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface JwtPayload {
  id: string
  role: string
  profileCompleted?: boolean
}

export function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // If already authenticated, redirect based on token
  const existingToken = localStorage.getItem('cleartrust_jwt')
  if (existingToken) {
    try {
      const decoded = jwtDecode<JwtPayload>(existingToken)
      if (!decoded.profileCompleted) {
        return <Navigate to="/complete-profile" replace />
      }
      
      if (decoded.role === 'DONOR') return <Navigate to="/explore" replace />
      if (decoded.role === 'NGO') return <Navigate to="/ngo/dashboard" replace />
      if (decoded.role === 'VENDOR') return <Navigate to="/vendor/pos" replace />
    } catch (e) {
      // Invalid token, continue to login page
      localStorage.removeItem('cleartrust_jwt')
    }
  }

  const handleLoginSuccess = async (credentialResponse: any) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiBaseUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      })
      
      if (!res.ok) throw new Error('Authentication failed on server')
      const data = await res.json()
      const jwtToken = data.token

      if (!jwtToken) throw new Error('No token received')

      localStorage.setItem('cleartrust_jwt', jwtToken)
      
      const decoded = jwtDecode<JwtPayload>(jwtToken)
      
      toast({
        title: "Authentication Successful",
        description: "Welcome to ClearTrust network.",
      })

      // Route based on profile completion and role
      if (!decoded.profileCompleted) {
        navigate('/complete-profile')
      } else if (decoded.role === 'DONOR') {
        navigate('/explore')
      } else if (decoded.role === 'NGO') {
        navigate('/ngo/dashboard')
      } else if (decoded.role === 'VENDOR') {
        navigate('/vendor/pos')
      } else {
        // Fallback
        navigate('/explore')
      }

    } catch (error) {
      console.error('Login failed:', error)
      toast({
        title: "Authentication Failed",
        description: "Could not connect to the backend server or invalid credentials.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 w-full min-h-[calc(100vh-80px)]">
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
    </div>
  )
}
