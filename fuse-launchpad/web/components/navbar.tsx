'use client';

import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Rocket, Coins, LineChart, Crown, Gift, Sparkles, Zap, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 glass-strong">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center glow-blue group-hover:glow-blue-strong transition-all duration-300">
              <Zap className="h-6 w-6 text-white" />
              <div className="absolute inset-0 rounded-xl bg-blue-400/20 animate-pulse-glow" />
            </div>
            <span className="text-2xl font-black tracking-tight gradient-text">FUSE.FUN</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            <Link href="/create">
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-blue-500/10 transition-all duration-300">
                <Sparkles className="h-4 w-4 text-blue-400" />
                Create Token
              </Button>
            </Link>
            <Link href="/my-tokens">
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-blue-500/10 transition-all duration-300">
                <Coins className="h-4 w-4 text-blue-400" />
                My Tokens
              </Button>
            </Link>
            <Link href="/trade">
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-blue-500/10 transition-all duration-300">
                <LineChart className="h-4 w-4 text-blue-400" />
                Trade
              </Button>
            </Link>
            <Link href="/king">
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-yellow-500/10 transition-all duration-300">
                <Crown className="h-4 w-4 text-yellow-400" />
                King of Hill
              </Button>
            </Link>
            <Link href="/referral">
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-green-500/10 transition-all duration-300">
                <Gift className="h-4 w-4 text-green-400" />
                Referral
              </Button>
            </Link>            <Link href="/how-it-works">
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-purple-500/10 transition-all duration-300">
                <Info className="h-4 w-4 text-purple-400" />
                How it Works
              </Button>
            </Link>          </div>
        </div>

        <div className="flex items-center gap-4">
          <WalletMultiButton className="!bg-gradient-to-r !from-blue-600 !to-blue-500 !h-10 !px-5 !rounded-xl !text-sm !font-bold hover:!from-blue-500 hover:!to-blue-400 !transition-all !duration-300 !shadow-lg !shadow-blue-500/25 hover:!shadow-blue-500/40" />
        </div>
      </div>
    </nav>
  );
}

