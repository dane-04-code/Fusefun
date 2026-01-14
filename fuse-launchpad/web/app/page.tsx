"use client";

import { useState, useEffect } from "react";
import { TokenCard } from "@/components/dashboard/TokenCard";
import { HeroSection } from "@/components/dashboard/HeroSection";

// Helper function to format market cap
function formatMarketCap(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

// Token interface from API
interface ApiToken {
  mint: string;
  name: string;
  symbol: string;
  uri?: string;
  image_uri?: string;
  creator: string;
  created_at: string;
  market_cap?: number;
  progress?: number;
  description?: string;
  volume_24h?: number;
}

type FilterTab = "all" | "trending" | "new" | "graduating";

export default function Home() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tokens from the API
  useEffect(() => {
    async function fetchTokens() {
      try {
        setLoading(true);
        const response = await fetch("/api/tokens");
        if (!response.ok) {
          throw new Error("Failed to fetch tokens");
        }
        const data = await response.json();
        const fetchedTokens = data.tokens || data || [];
        setTokens(fetchedTokens);
      } catch (err) {
        console.error("Error fetching tokens:", err);
        setError("Failed to fetch tokens");
        setTokens([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, []);

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "trending", label: "Trending" },
    { id: "new", label: "Newest" },
    { id: "graduating", label: "Graduating" },
  ];

  return (
    <div className="w-full">
      {/* Hero Section (Market Today + 4 Columns) */}
      <HeroSection />

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-muted/30 p-2 rounded-xl border border-white/5">
        {/* Search */}
        <div className="relative w-full sm:w-auto flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search ..."
            className="w-full bg-background border border-border rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground border border-border px-1.5 rounded">
            ⌘ J
          </div>
        </div>

        {/* Filters currently disabled in UI but kept in logic or replaced by simple toggles as per image */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            <input type="checkbox" className="rounded border-border bg-muted text-primary focus:ring-0" />
            Listed on Raydium
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <select className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none">
              <option>Last Bump</option>
              <option>Market Cap</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Order:</span>
            <select className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none">
              <option>Desc</option>
              <option>Asc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Token Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-black/40 border border-slate-800 p-4 animate-pulse"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-700 rounded" />
                <div className="flex-1">
                  <div className="h-5 bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
              <div className="h-2 bg-slate-700 rounded mb-4" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-8 bg-slate-700 rounded" />
                <div className="h-8 bg-slate-700 rounded" />
              </div>
            </div>
          ))
        ) : error ? (
          // Error state
          <div className="col-span-full text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Try Again
            </button>
          </div>
        ) : tokens.length === 0 ? (
          // Empty state
          <div className="col-span-full text-center py-12">
            <p className="text-slate-400 mb-2">No tokens created yet</p>
            <p className="text-slate-500 text-sm">Be the first to create a token!</p>
          </div>
        ) : (
          // Real tokens from API
          tokens.map((token) => (
            <TokenCard
              key={token.mint}
              id={token.mint}
              name={token.name}
              ticker={`$${token.symbol}`}
              image={token.image_uri}
              marketCap={formatMarketCap(token.market_cap || 0)}
              progress={token.progress || 0}
              creator={token.creator ? `${token.creator.slice(0, 4)}...${token.creator.slice(-4)}` : "Anon"}
              description={token.description}
              volume24h={token.volume_24h ? formatMarketCap(token.volume_24h) : undefined}
            />
          ))
        )}
      </div>

      {/* Load More - only show if there are tokens */}
      {!loading && !error && tokens.length > 0 && (
        <div className="text-center mb-12">
          <button className="px-8 py-3 rounded-xl font-semibold border border-border hover:border-primary/50 hover:bg-white/5 transition-all text-sm">
            Load More Tokens ↓
          </button>
        </div>
      )}
    </div>
  );
}
