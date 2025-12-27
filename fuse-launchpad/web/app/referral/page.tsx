'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Copy, Check, DollarSign, Users, TrendingUp } from 'lucide-react';

interface ReferralStats {
  total: number;
  pending: number;
  claimed: number;
  history: any[];
}

export default function ReferralPage() {
  const wallet = useWallet();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (wallet.publicKey) {
      fetchReferralData();
    }
  }, [wallet.publicKey]);

  const fetchReferralData = async () => {
    if (!wallet.publicKey) return;
    
    try {
      // Fetch code
      const codeRes = await fetch(`http://localhost:3001/api/referrals/${wallet.publicKey.toString()}`);
      if (codeRes.ok) {
        const data = await codeRes.json();
        setReferralCode(data.code);
      }

      // Fetch stats
      const statsRes = await fetch(`http://localhost:3001/api/referrals/${wallet.publicKey.toString()}/earnings`);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Error fetching referral data:", e);
    }
  };

  const handleCreateCode = async () => {
    if (!wallet.publicKey || !inputCode) return;
    
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:3001/api/referrals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wallet.publicKey.toString(),
          code: inputCode
        })
      });

      if (res.ok) {
        setReferralCode(inputCode);
        fetchReferralData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create code');
      }
    } catch (e) {
      console.error("Error creating code:", e);
      alert("Error creating code");
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (referralCode) {
      const link = `${window.location.origin}?ref=${referralCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!wallet.connected) {
    return (
      <div className="container max-w-4xl py-20 mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <Gift className="w-10 h-10 text-green-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4">Refer & Earn</h1>
        <p className="text-xl text-gray-400 mb-8">
          Connect your wallet to start earning 1% of trading fees from your referrals.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10 mx-auto px-4">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          Referral Program
        </h1>
        <p className="text-xl text-gray-400">
          Earn 1% of trading fees for every user you refer to FUSE.FUN
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="bg-[#12121a] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {stats?.total.toFixed(4) || '0.0000'} SOL
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#12121a] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Pending Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              {stats?.pending.toFixed(4) || '0.0000'} SOL
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#12121a] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4" /> Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {stats?.history.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#12121a] border-white/10 mb-10">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>Share this link to start earning rewards</CardDescription>
        </CardHeader>
        <CardContent>
          {referralCode ? (
            <div className="flex gap-4">
              <div className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 font-mono text-sm text-gray-300 truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}?ref=${referralCode}` : `.../?ref=${referralCode}`}
              </div>
              <Button onClick={copyLink} className="bg-blue-600 hover:bg-blue-500">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          ) : (
            <div className="flex gap-4">
              <Input
                placeholder="Enter a custom code (e.g. moonboi)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="bg-black/30 border-white/10"
              />
              <Button 
                onClick={handleCreateCode} 
                disabled={isLoading || !inputCode}
                className="bg-green-600 hover:bg-green-500"
              >
                {isLoading ? 'Creating...' : 'Create Code'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {stats?.history && stats.history.length > 0 && (
        <Card className="bg-[#12121a] border-white/10">
          <CardHeader>
            <CardTitle>Recent Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.history.map((item, i) => (
                <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium text-sm">
                      {item.action === 'trade' ? 'Trade Commission' : 'Referral Bonus'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-green-400 font-mono text-sm">
                    +{item.earning.toFixed(6)} SOL
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
