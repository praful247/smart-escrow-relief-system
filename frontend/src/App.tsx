import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { LogOut, ShieldCheck } from 'lucide-react'

import { LoginPage } from './pages/LoginPage'
import { CompleteProfilePage } from './pages/CompleteProfilePage'
import { ExploreNgosPage } from './pages/ExploreNgosPage'
import { NgoDetailPage } from './pages/NgoDetailPage'
import { NgoDashboardPackages } from './pages/NgoDashboardPackages'
import { NgoDashboard } from './pages/NgoDashboard'
import { FieldIntakePage } from './pages/FieldIntakePage'
import { VendorPosPage } from './pages/VendorPosPage'
import DonorImpactPage from './pages/DonorImpactPage'
import NgoAnalyticsPage from './pages/NgoAnalyticsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'

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

      <main className="flex-1 flex flex-col items-center w-full">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          
          <Route path="/complete-profile" element={
            <ProtectedRoute>
              <CompleteProfilePage />
            </ProtectedRoute>
          } />
          
          <Route path="/explore" element={
            <ProtectedRoute>
              <ExploreNgosPage />
            </ProtectedRoute>
          } />

          <Route path="/ngo/:id" element={
            <ProtectedRoute>
              <NgoDetailPage />
            </ProtectedRoute>
          } />
          
          <Route path="/ngo/dashboard" element={
            <ProtectedRoute>
              <NgoDashboard />
            </ProtectedRoute>
          } />

          <Route path="/ngo/field-intake" element={
            <ProtectedRoute>
              <FieldIntakePage />
            </ProtectedRoute>
          } />

          <Route path="/ngo/packages" element={
            <ProtectedRoute>
              <NgoDashboardPackages />
            </ProtectedRoute>
          } />
          
          <Route path="/ngo/analytics" element={
            <ProtectedRoute>
              <NgoAnalyticsPage />
            </ProtectedRoute>
          } />

          <Route path="/vendor/pos" element={
            <ProtectedRoute>
              <VendorPosPage />
            </ProtectedRoute>
          } />
          
          <Route path="/donor/impact" element={
            <ProtectedRoute>
              <DonorImpactPage />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-12 py-12">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-primary mb-4">
              <ShieldCheck className="h-6 w-6 text-accent-foreground" />
              <h2 className="text-xl font-bold tracking-tight">ClearTrust</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              A transparent, blockchain-powered disaster relief platform ensuring that every donation reaches verified beneficiaries with zero fraud.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li><a href="#" className="hover:text-primary transition-colors">How it works</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">For Donors</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">For NGOs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blockchain Transparency</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Vendor Agreement</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-8 mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center text-sm text-slate-400">
          <p>© {new Date().getFullYear()} ClearTrust. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Powered by Avalanche Network</p>
        </div>
      </footer>

      <Toaster />
    </div>
  )
}
