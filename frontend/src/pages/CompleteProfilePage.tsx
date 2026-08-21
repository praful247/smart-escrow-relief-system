import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { jwtDecode } from 'jwt-decode'
import { ShieldCheck, Loader2 } from 'lucide-react'

export function CompleteProfilePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // In a real app we might fetch user role or determine it from the JWT
  const token = localStorage.getItem('cleartrust_jwt')
  let role = 'DONOR'
  if (token) {
    try {
      role = jwtDecode<{role: string}>(token).role
    } catch (e) {
      // ignore
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Mocking an API call to complete the profile
    setTimeout(() => {
      setLoading(false)
      toast({
        title: "Profile Completed",
        description: "Your profile has been updated successfully.",
      })
      
      // In a real scenario, the backend would issue a new JWT with profileCompleted: true
      // Or we just redirect them based on their role
      if (role === 'DONOR') navigate('/explore')
      else if (role === 'NGO') navigate('/ngo/dashboard')
      else if (role === 'VENDOR') navigate('/vendor/pos')
      else navigate('/explore')
    }, 1500)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 w-full min-h-[calc(100vh-80px)]">
      <div className="max-w-md w-full">
        <Card className="border-0 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl font-semibold">Complete Your Profile</CardTitle>
            <CardDescription>
              We need a few more details before you can access the {role} dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {role === 'DONOR' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                    <input type="number" required min="18" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. 25" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                    <input type="tel" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="+1 (555) 000-0000" />
                  </div>
                </>
              )}

              {role === 'NGO' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Organization Name</label>
                    <input type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. Global Relief Fund" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Registration Number</label>
                    <input type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Govt. Reg No." />
                  </div>
                </>
              )}

              {role === 'VENDOR' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Store Name</label>
                    <input type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. City Supermarket" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Business License</label>
                    <input type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="License Number" />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
