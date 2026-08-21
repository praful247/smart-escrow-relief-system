import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { BarChart3, Ticket, CheckCircle2, MapPin } from 'lucide-react';

interface VendorRedemption {
  vendorName: string;
  latitude: number;
  longitude: number;
  amount: number;
  txHash: string;
}

interface AnalyticsData {
  totalFundsRaised: number;
  vouchersIssued: number;
  vouchersRedeemed: number;
  vendorRedemptions: VendorRedemption[];
}

export default function NgoAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBaseUrl}/ngo/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: You must be an NGO to view this page.');
        throw new Error('Failed to fetch data');
      }
      const data = await res.json();
      if (!data.error) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-white">
        Failed to load analytics. Are you registered as an NGO?
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Analytics Ledger</h1>
        <p className="text-slate-400">Track your relief funds, voucher distribution, and vendor redemptions.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Total Funds Raised</p>
                <h3 className="text-3xl font-bold text-white">₹{analytics.totalFundsRaised.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <BarChart3 className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Vouchers Assigned</p>
                <h3 className="text-3xl font-bold text-white">{analytics.vouchersIssued}</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Ticket className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Vouchers Redeemed</p>
                <h3 className="text-3xl font-bold text-white">{analytics.vouchersRedeemed}</h3>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Redemptions List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white">Recent Vendor Redemptions</CardTitle>
          <CardDescription className="text-slate-400">Live tracking of where beneficiaries are spending vouchers.</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.vendorRedemptions.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No redemptions yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {analytics.vendorRedemptions.map((redemption, idx) => (
                <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800 rounded-full mt-1">
                      <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">{redemption.vendorName}</p>
                      <p className="text-xs text-slate-500 font-mono">Lat: {redemption.latitude.toFixed(4)}, Lng: {redemption.longitude.toFixed(4)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">₹{redemption.amount}</p>
                    </div>
                    <a 
                      href={`https://subnets-test.avax.network/cleartrust/tx/${redemption.txHash}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-cyan-500 hover:text-cyan-400 uppercase tracking-wider font-semibold border border-cyan-500/30 px-3 py-1.5 rounded"
                    >
                      View Tx
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
