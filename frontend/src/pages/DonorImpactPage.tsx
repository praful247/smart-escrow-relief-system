import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { MapPin, CheckCircle2, Clock, ShieldCheck, ExternalLink, Activity } from 'lucide-react';

interface ImpactVoucher {
  voucher: {
    id: string;
    status: string;
    voucherHash: string;
    txHash: string | null;
  };
  package: {
    title: string;
    priceInInr: string;
  };
  ngo: {
    name: string | null;
  };
  vendor: {
    storeName: string | null;
  } | null;
}

export default function DonorImpactPage() {
  const [impactData, setImpactData] = useState<ImpactVoucher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImpactData();
  }, []);

  const fetchImpactData = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBaseUrl}/donor/impact`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: You must be a Donor to view this page.');
        throw new Error('Failed to fetch data');
      }
      const data = await res.json();
      if (data.impact) {
        setImpactData(data.impact);
      }
    } catch (error) {
      console.error('Failed to fetch impact data', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return { color: 'text-slate-400', bg: 'bg-slate-900', icon: Clock, label: 'Payment Processing' };
      case 'ISSUED':
        return { color: 'text-amber-500', bg: 'bg-amber-950', icon: Activity, label: 'Issued to Victim' };
      case 'REDEEMED':
        return { color: 'text-emerald-500', bg: 'bg-emerald-950', icon: CheckCircle2, label: 'Aid Redeemed' };
      default:
        return { color: 'text-slate-400', bg: 'bg-slate-900', icon: Clock, label: 'Unknown' };
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 tracking-tight mb-4">
          Track Your Impact
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
          Every rupee you donate is tracked on the blockchain. See exactly when and where your aid is delivered to those who need it most.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="bg-slate-900/50 backdrop-blur-md rounded-lg p-6 border border-slate-800 text-center">
            <div className="text-3xl font-bold text-white">{impactData.length}</div>
            <div className="text-sm text-slate-400 mt-1">Total Packages Funded</div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-lg p-6 border border-slate-800 text-center">
            <div className="text-3xl font-bold text-white">
              ₹{impactData.reduce((sum, item) => sum + (Number(item.package?.priceInInr) || 0), 0).toLocaleString('en-IN')}
            </div>
            <div className="text-sm text-slate-400 mt-1">Total Spent</div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-lg p-6 border border-slate-800 text-center">
            <div className="text-3xl font-bold text-emerald-400">
              {impactData.filter(i => i.voucher.status === 'REDEEMED').length}
            </div>
            <div className="text-sm text-slate-400 mt-1">Packages Delivered</div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-lg p-6 border border-slate-800 text-center">
            <div className="text-3xl font-bold text-cyan-400">100%</div>
            <div className="text-sm text-slate-400 mt-1">On-Chain Verified</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
        </div>
      ) : impactData.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <ShieldCheck className="h-16 w-16 text-slate-700 mb-6" />
            <h3 className="text-2xl font-semibold text-white mb-2">No donations found</h3>
            <p className="text-slate-400 max-w-md">
              You haven't made any donations yet. Visit the Explore page to find NGOs responding to active crisis zones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {impactData.map((item, i) => {
            const statusConfig = getStatusConfig(item.voucher.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card key={i} className="bg-slate-900/40 border-slate-800 overflow-hidden relative group">
                <div className={`absolute top-0 left-0 w-1 h-full ${statusConfig.bg.replace('bg-', 'bg-opacity-100 bg-')}`}></div>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    
                    {/* Left: Donation Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color} border border-current/20 flex items-center gap-1.5`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                        <span className="text-slate-500 text-xs font-mono">
                          ID: {item.voucher.id.split('-')[0]}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-1">
                        {item.package?.title || 'Custom Donation'}
                      </h3>
                      <p className="text-slate-400 text-sm mb-4">
                        Donated to <span className="text-slate-300 font-medium">{item.ngo?.name || 'Unknown NGO'}</span>
                      </p>
                      
                      <div className="text-3xl font-light text-white font-mono">
                        ₹{item.package?.priceInInr || '0'}
                      </div>
                    </div>

                    {/* Right: Tracking Journey */}
                    <div className="flex-1 bg-slate-950/50 rounded-xl p-5 border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Escrow Audit Trail</h4>
                      
                      <div className="relative pl-6 space-y-6">
                        {/* Timeline line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-800"></div>
                        
                        {/* Step 1: Funded */}
                        <div className="relative">
                          <div className="absolute -left-6 w-5 h-5 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center z-10">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          </div>
                          <p className="text-sm font-medium text-slate-300">Funds Escrowed</p>
                          <p className="text-xs text-slate-500 mt-1">Smart contract locked your donation.</p>
                        </div>
                        
                        {/* Step 2: Issued */}
                        <div className="relative">
                          <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center z-10 border-2 
                            ${item.voucher.status === 'ISSUED' || item.voucher.status === 'REDEEMED' 
                              ? 'bg-amber-500/20 border-amber-500' 
                              : 'bg-slate-900 border-slate-700'}`}>
                            {(item.voucher.status === 'ISSUED' || item.voucher.status === 'REDEEMED') && (
                              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                            )}
                          </div>
                          <p className={`text-sm font-medium ${item.voucher.status === 'ISSUED' || item.voucher.status === 'REDEEMED' ? 'text-slate-300' : 'text-slate-600'}`}>Voucher Assigned</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.voucher.status === 'ISSUED' || item.voucher.status === 'REDEEMED' 
                              ? 'Field worker gave this voucher to a victim.' 
                              : 'Waiting for field worker to assign.'}
                          </p>
                        </div>

                        {/* Step 3: Redeemed */}
                        <div className="relative">
                          <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center z-10 border-2 
                            ${item.voucher.status === 'REDEEMED' 
                              ? 'bg-cyan-500/20 border-cyan-500' 
                              : 'bg-slate-900 border-slate-700'}`}>
                            {item.voucher.status === 'REDEEMED' && (
                              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                            )}
                          </div>
                          <p className={`text-sm font-medium ${item.voucher.status === 'REDEEMED' ? 'text-slate-300' : 'text-slate-600'}`}>Aid Delivered</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.voucher.status === 'REDEEMED' 
                              ? `Redeemed at ${item.vendor?.storeName || 'Vendor'}` 
                              : 'Waiting for victim to redeem.'}
                          </p>
                          
                          {item.voucher.txHash && (
                            <a 
                              href={`https://subnets-test.avax.network/cleartrust/tx/${item.voucher.txHash}`}
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-cyan-400 hover:text-cyan-300 mt-2 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View on Explorer
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
