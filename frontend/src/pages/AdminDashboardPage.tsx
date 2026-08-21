import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Users, Building2, Ticket, CheckCircle2, Store } from 'lucide-react';

interface Ngo {
  id: string;
  name: string;
  registrationNumber: string;
  isVerified: boolean;
  createdAt: string;
}

interface Stats {
  usersCount: number;
  ngosCount: number;
  vouchersCount: number;
  vendorsCount: number;
}

export default function AdminDashboardPage() {
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const token = localStorage.getItem('cleartrust_jwt');
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, ngosRes] = await Promise.all([
        fetch(`${apiBaseUrl}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiBaseUrl}/admin/ngos`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (ngosRes.ok) setNgos(await ngosRes.json());
      
      if (!statsRes.ok || !ngosRes.ok) {
        if (statsRes.status === 403 || ngosRes.status === 403) {
          throw new Error("Forbidden: You must be an ADMIN to view this page.");
        }
        throw new Error("Failed to load admin data");
      }
    } catch (error: any) {
      console.error('Failed to fetch admin data', error);
      toast({
        title: "Access Denied",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (ngoId: string, isVerified: boolean) => {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/ngos/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ngoId, isVerified })
      });

      if (!res.ok) throw new Error('Failed to update verification status');

      toast({
        title: "Success",
        description: `NGO has been ${isVerified ? 'verified' : 'unverified'}.`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 tracking-tight mb-4">
          Super Admin Panel
        </h1>
        <p className="text-slate-400">Manage platform access and monitor global metrics.</p>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Users</p>
                <h3 className="text-3xl font-bold text-white">{stats.usersCount}</h3>
              </div>
              <Users className="w-8 h-8 text-slate-500 opacity-50" />
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">NGOs</p>
                <h3 className="text-3xl font-bold text-white">{stats.ngosCount}</h3>
              </div>
              <Building2 className="w-8 h-8 text-slate-500 opacity-50" />
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Vendors</p>
                <h3 className="text-3xl font-bold text-white">{stats.vendorsCount}</h3>
              </div>
              <Store className="w-8 h-8 text-slate-500 opacity-50" />
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Vouchers</p>
                <h3 className="text-3xl font-bold text-white">{stats.vouchersCount}</h3>
              </div>
              <Ticket className="w-8 h-8 text-slate-500 opacity-50" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* NGO Verification Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-xl text-white">NGO Approvals</CardTitle>
          <CardDescription>Verify NGOs before they can list aid packages to the public.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">NGO Name</th>
                  <th className="px-6 py-4 font-medium">Registration No.</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ngos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No NGOs registered yet.</td>
                  </tr>
                ) : (
                  ngos.map(ngo => (
                    <tr key={ngo.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{ngo.name || 'Unknown'}</td>
                      <td className="px-6 py-4 font-mono text-slate-400">{ngo.registrationNumber}</td>
                      <td className="px-6 py-4">
                        {ngo.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-400/20">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-400/20">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant={ngo.isVerified ? "destructive" : "default"}
                          className={!ngo.isVerified ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                          onClick={() => handleVerify(ngo.id, !ngo.isVerified)}
                        >
                          {ngo.isVerified ? 'Revoke Access' : 'Approve NGO'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
