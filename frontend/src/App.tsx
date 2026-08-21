import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { LogOut, ShieldCheck } from 'lucide-react'

import { LoginPage } from './pages/LoginPage'
import { CompleteProfilePage } from './pages/CompleteProfilePage'
import { DonatePage } from './components/DonatePage'
import { NgoDashboard } from './pages/NgoDashboard'
import { VendorPos } from './pages/VendorPos'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('cleartrust_jwt')
  if (!token) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Quick check for UI header rendering
  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem('cleartrust_jwt'))
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('cleartrust_jwt')
    setIsAuthenticated(false)
    toast({
      title: "Logged Out",
      description: "You have been securely logged out.",
    })
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <header className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary cursor-pointer" onClick={() => navigate('/')}>
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

      <main className="flex-1 flex flex-col items-center">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          
          <Route path="/complete-profile" element={
            <ProtectedRoute>
              <CompleteProfilePage />
            </ProtectedRoute>
          } />
          
          <Route path="/explore" element={
            <ProtectedRoute>
              <div className="w-full max-w-6xl p-8">
                <DonatePage 
                  token={localStorage.getItem('cleartrust_jwt')} 
                />
              </div>
            </ProtectedRoute>
          } />
          
          <Route path="/ngo/dashboard" element={
            <ProtectedRoute>
              <NgoDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/vendor/pos" element={
            <ProtectedRoute>
              <VendorPos />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}
