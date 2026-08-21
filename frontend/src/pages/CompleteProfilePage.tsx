import { useState, useEffect } from 'react'
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
  
  // State for form fields
  const [role, setRole] = useState('DONOR')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('PREFER_NOT_TO_SAY')
  const [phone, setPhone] = useState('')
  const [orgName, setOrgName] = useState('')
  const [regNo, setRegNo] = useState('')
  const [description, setDescription] = useState('')
  const [missionStatement, setMissionStatement] = useState('')
  const [storeName, setStoreName] = useState('')
  const [license, setLicense] = useState('')

  const token = localStorage.getItem('cleartrust_jwt')

  // We check if they already have a role encoded in JWT. If so, they might just be missing fields.
  // But the prompt says "add a Role Selection dropdown", so we let them choose the role to complete the profile.
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode<{role: string}>(token)
        if (decoded.role) {
          setRole(decoded.role)
        }
      } catch (e) {
        // ignore
      }
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
      
      // Construct payload based on selected role
      const payload: any = { role, gender }
      if (role === 'DONOR') {
        payload.age = parseInt(age, 10)
        payload.phone = phone
      } else if (role === 'NGO') {
        payload.organizationName = orgName
        payload.registrationNumber = regNo
        payload.description = description
        payload.missionStatement = missionStatement
      } else if (role === 'VENDOR') {
        payload.storeName = storeName
        payload.businessLicense = license
      }

      const res = await fetch(`${apiBaseUrl}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to update profile')
      }

      const data = await res.json()
      
      if (data.token) {
        localStorage.setItem('cleartrust_jwt', data.token)
      }

      toast({
        title: "Profile Completed",
        description: "Your profile has been updated successfully.",
      })
      
      // Route based on role
      if (role === 'DONOR') navigate('/explore')
      else if (role === 'NGO') navigate('/ngo/dashboard')
      else if (role === 'FIELD_WORKER') navigate('/ngo/field-intake')
      else if (role === 'VENDOR') navigate('/vendor/pos')
      else navigate('/explore')
      
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Profile Update Failed",
        description: err.message || "An error occurred while updating your profile.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 w-full min-h-[calc(100vh-80px)]">
      <div className="max-w-md w-full">
        <Card className="border-0 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl font-semibold">Complete Your Profile</CardTitle>
            <CardDescription>
              We need a few more details before you can access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">I am a...</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="DONOR">Donor</option>
                  <option value="NGO">NGO Organization</option>
                  <option value="FIELD_WORKER">NGO Field Worker</option>
                  <option value="VENDOR">Vendor</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {role === 'DONOR' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                    <input type="number" required min="18" value={age} onChange={e => setAge(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="e.g. 25" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="+1 (555) 000-0000" />
                  </div>
                </>
              )}

              {role === 'NGO' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Organization Name</label>
                    <input type="text" required value={orgName} onChange={e => setOrgName(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="e.g. Global Relief Fund" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Registration Number</label>
                    <input type="text" required value={regNo} onChange={e => setRegNo(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="Govt. Reg No." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                    <textarea required value={description} onChange={e => setDescription(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="Describe your NGO's purpose..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mission Statement</label>
                    <textarea required value={missionStatement} onChange={e => setMissionStatement(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="Your core mission statement..." />
                  </div>
                </>
              )}

              {role === 'FIELD_WORKER' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Your account will be provisioned as a field worker. Ensure your NGO admin has whitelisted your email.</p>
                </div>
              )}

              {role === 'VENDOR' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Store Name</label>
                    <input type="text" required value={storeName} onChange={e => setStoreName(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="e.g. City Supermarket" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Business License</label>
                    <input type="text" required value={license} onChange={e => setLicense(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" placeholder="License Number" />
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
