'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TokenCard } from "@/components/token-card";
import {
  Search, Flame, Clock, TrendingUp, Zap, Rocket, Shield,
  Users, BarChart3, Crown, Sparkles, ArrowRight, Play,
  CheckCircle2, Star, Globe, Lock, Coins, Trophy
} from "lucide-react";
import Link from "next/link";

// Define Token Interface
interface Token {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  creator: string;
  marketCap: number;
  volume24h: number;
  virtualSol: string;
  realSol: string;
  complete: boolean;
}

export default function Home() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [activeTab, setActiveTab] = useState("trending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tokens from backend
  const fetchTokens = async (sortType: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // Map tab value to API sort parameter
      const sortParam = sortType === "trending" ? "marketcap" : "newest";
      
      // Use 127.0.0.1 to avoid localhost resolution issues
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`http://127.0.0.1:3001/api/tokens?sort=${sortParam}&limit=20`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`Failed to fetch tokens: ${res.status}`);
      
      const data = await res.json();
      setTokens(data);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTokens(activeTab);
  }, [activeTab]);

  // Calculate progress (85 SOL is graduation goal)
  const calculateProgress = (realSol: string) => {
    const sol = parseFloat(realSol) / 1e9;
    const progress = (sol / 85) * 100;
    return Math.min(progress, 100);
  };

  // Format Market Cap
  const formatMC = (mc: number) => {
    if (mc >= 1000000) return `$${(mc / 1000000).toFixed(1)}M`;
    if (mc >= 1000) return `$${(mc / 1000).toFixed(1)}k`;
    return `$${mc.toFixed(0)}`;
  };



  const stats = [
    { label: "Total Volume", value: "$2.4M", icon: BarChart3, color: "text-blue-400" },
    { label: "Tokens Launched", value: "1,247", icon: Rocket, color: "text-green-400" },
    { label: "Active Traders", value: "8,432", icon: Users, color: "text-purple-400" },
    { label: "Graduated Tokens", value: "89", icon: Trophy, color: "text-yellow-400" },
  ];

  const features = [
    { 
      icon: Zap, 
      title: "Instant Launch", 
      description: "Create and deploy your token in under 60 seconds. No coding required.",
      color: "from-blue-500 to-cyan-500"
    },
    { 
      icon: Shield, 
      title: "100% Fair Launch", 
      description: "No presale, no team allocation. Everyone starts equal.",
      color: "from-green-500 to-emerald-500"
    },
    { 
      icon: Lock, 
      title: "Locked Liquidity", 
      description: "Liquidity is automatically locked and burned on graduation.",
      color: "from-purple-500 to-pink-500"
    },
    { 
      icon: Coins, 
      title: "Creator Rewards", 
      description: "Earn 0.2% of all trading fees from your token.",
      color: "from-yellow-500 to-orange-500"
    },
  ];

  return (
    <div className="relative">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-black">
          {/* Video Background */}
          <div className="absolute inset-0 z-0 opacity-40">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover"
            >
              <source src="/hero.mp4" type="video/mp4" />
              {/* Fallback for gif if preferred */}
              {/* <img src="/hero.gif" className="w-full h-full object-cover" /> */}
            </video>
            {/* Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-black/60" />
          </div>

          {/* Gradient Orbs */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[100px] animate-float animation-delay-200" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-[150px] animate-pulse" />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="container relative z-10 py-20">
          <div className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
            {/* Badge */}
            <div className="animate-fade-in-up">
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                The #1 Memecoin Launchpad on Solana
              </Badge>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight animate-fade-in-up animation-delay-100">
              <span className="block text-white">Create, Trade &</span>
              <span className="block gradient-text-animated">Dominate</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl animate-fade-in-up animation-delay-200">
              Launch your memecoin in seconds. No coding required. 
              <span className="text-blue-400 font-semibold"> 100% fair launch guaranteed.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4 animate-fade-in-up animation-delay-300">
              <Link href="/create">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-lg h-14 px-10 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 group">
                  <Rocket className="mr-2 h-5 w-5 group-hover:animate-bounce-subtle" />
                  Launch Your Coin
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 font-bold text-lg h-14 px-10 rounded-xl transition-all duration-300 group">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-muted-foreground animate-fade-in-up animation-delay-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>No Rug Pulls</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Instant Trading</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Low Fees</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Built on Solana</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-blue-500/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section className="py-16 relative border-t border-b border-blue-500/10 bg-gradient-to-b from-black via-blue-950/10 to-black">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-gradient-to-b from-muted/30 to-transparent border border-border/30 hover:border-blue-500/30 transition-all duration-300 hover-lift">
                <stat.icon className={`h-8 w-8 mx-auto mb-3 ${stat.color}`} />
                <p className="text-3xl md:text-4xl font-black text-white mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED TOKEN (KING OF HILL) ===== */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5" />
        <div className="container relative z-10">
          <div className="flex items-center justify-center gap-3 mb-10">
            <Crown className="h-8 w-8 text-yellow-400 animate-bounce-subtle" />
            <h2 className="text-3xl md:text-4xl font-black text-center">King of the Hill</h2>
            <Crown className="h-8 w-8 text-yellow-400 animate-bounce-subtle" />
          </div>
          
          <div className="max-w-4xl mx-auto">
            <Card className="glass border-yellow-500/30 p-8 hover:border-yellow-500/50 transition-all duration-300 hover-glow relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent" />
              <div className="grid md:grid-cols-2 gap-8 relative z-10">
                <div className="aspect-square rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/20">
                  <span className="text-8xl">👑</span>
                </div>
                <div className="flex flex-col justify-center gap-4">
                  <Badge className="w-fit bg-yellow-500 text-black font-bold">
                    <Trophy className="h-3 w-3 mr-1" />
                    Current King
                  </Badge>
                  <h3 className="text-4xl font-black">Winnie The Poo</h3>
                  <p className="text-xl text-blue-400 font-mono">$POO</p>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground">Market Cap</p>
                      <p className="text-2xl font-bold text-green-400">$42.0k</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Progress</p>
                      <p className="text-2xl font-bold text-yellow-400">85%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Holders</p>
                      <p className="text-2xl font-bold text-blue-400">234</p>
                    </div>
                  </div>
                  <Link href="/trade/POO">
                    <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold h-12 rounded-xl mt-2">
                      Trade Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="py-20 relative">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 mb-4">
              Why FUSE.FUN?
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Built for <span className="gradient-text">Fairness</span></h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The most trusted platform for launching and trading memecoins on Solana.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="glass p-6 border-border/30 hover:border-blue-500/30 transition-all duration-300 hover-lift group">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TOKEN TERMINAL ===== */}
      <section className="py-20 relative bg-gradient-to-b from-transparent via-blue-950/10 to-transparent">
        <div className="container">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30 mb-4">
                <Flame className="h-3 w-3 mr-1 animate-pulse" />
                Live Terminal
              </Badge>
              <h2 className="text-4xl font-black">Trending Tokens</h2>
              <p className="text-muted-foreground mt-2">Discover the hottest launches on Solana right now.</p>
            </div>
            
            {/* Filter Bar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tokens..." className="pl-9 w-64 bg-muted/30 border-border/30 focus:border-blue-500/50 rounded-xl" />
              </div>
              <Tabs defaultValue="trending" className="w-[220px]" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 bg-muted/30 rounded-xl p-1">
                  <TabsTrigger value="trending" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Hot
                  </TabsTrigger>
                  <TabsTrigger value="new" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                    <Clock className="h-4 w-4 mr-1" />
                    New
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Token Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {error ? (
              <div className="col-span-full text-center py-20 text-red-500 bg-red-500/10 rounded-xl border border-red-500/20">
                <p className="text-xl font-bold mb-2">Error loading tokens</p>
                <p className="mb-4 font-mono text-sm">{error}</p>
                <Button onClick={() => fetchTokens(activeTab)} variant="outline" className="border-red-500/30 hover:bg-red-500/20">
                  Retry Connection
                </Button>
              </div>
            ) : isLoading ? (
              // Loading Skeletons
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="h-[300px] animate-pulse bg-muted/20 border-border/30" />
              ))
            ) : tokens.length > 0 ? (
              tokens.map((token, i) => (
                <div key={token.mint} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <Link href={`/trade/${token.mint}`}>
                    <TokenCard 
                      name={token.name}
                      ticker={token.symbol}
                      creator={token.creator.slice(0, 4) + '...' + token.creator.slice(-4)}
                      marketCap={formatMC(token.marketCap)}
                      progress={calculateProgress(token.realSol)}
                      mint={token.mint}
                      image={token.image || token.uri} // Use image URL if available, fallback to URI
                    />
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                No tokens found. Be the first to launch one!
              </div>
            )}
          </div>

          {/* View All */}
          <div className="text-center mt-12">
            <Button variant="outline" size="lg" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-bold rounded-xl px-10">
              View All Tokens
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-blue-600/20" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <div className="container relative z-10 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              Ready to <span className="gradient-text">Launch?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Join thousands of creators who have launched their tokens on FUSE.FUN. 
              It only takes 60 seconds.
            </p>
            <Link href="/create">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xl h-16 px-14 rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 animate-pulse-glow">
                <Rocket className="mr-3 h-6 w-6" />
                Create Your Token Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border/30 py-12 bg-black">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-black gradient-text">FUSE.FUN</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/docs" className="hover:text-blue-400 transition-colors">Docs</Link>
              <Link href="/faq" className="hover:text-blue-400 transition-colors">FAQ</Link>
              <Link href="/terms" className="hover:text-blue-400 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-blue-400 transition-colors">Privacy</Link>
            </div>

            <div className="flex items-center gap-4">
              <a href="https://twitter.com" target="_blank" className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 transition-all">
                <Globe className="h-5 w-5" />
              </a>
              <a href="https://discord.com" target="_blank" className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 transition-all">
                <Users className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div className="text-center mt-8 pt-8 border-t border-border/20 text-sm text-muted-foreground">
            © 2025 FUSE.FUN. All rights reserved. Built on Solana.
          </div>
        </div>
      </footer>
    </div>
  );
}

