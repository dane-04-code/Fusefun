"use client";

import { useState } from "react";
import { TokenCard } from "@/components/dashboard/TokenCard";
import { HeroSection } from "@/components/dashboard/HeroSection";

// Mock data (Keeping existing mock data for the grid)
const mockTokens = [
  { id: "4", name: "PepeSol", ticker: "$PSOL", emoji: "🐸", marketCap: "$45.2K", progress: 38, creator: "User4921", description: "The most retro token on Solana" },
  { id: "5", name: "MoonCat", ticker: "$MCAT", emoji: "🐱", marketCap: "$78.5K", progress: 52, creator: "User8123", description: "Climb to the moon" },
  { id: "6", name: "FireDog", ticker: "$FDOG", emoji: "🐕", marketCap: "$12.3K", progress: 25, creator: "User5641", description: "Hot and spicy meme token" },
  { id: "7", name: "CyberApe", ticker: "$CAPE", emoji: "🦍", marketCap: "$34.1K", progress: 67, creator: "User2891", description: "Digital revolution" },
  { id: "8", name: "GhostToken", ticker: "$GHOST", emoji: "👻", marketCap: "$8.9K", progress: 15, creator: "User7412", description: "Boo! Scare the market" },
  { id: "9", name: "RocketShip", ticker: "$ROCKET", emoji: "🚀", marketCap: "$56.7K", progress: 78, creator: "User1234", description: "To infinity and beyond" },
  { id: "10", name: "DiamondHand", ticker: "$DIAMOND", emoji: "💎", marketCap: "$92.4K", progress: 88, creator: "User5678", description: "HODL forever" },
  { id: "11", name: "ThunderStrike", ticker: "$THUNDER", emoji: "⚡", marketCap: "$23.5K", progress: 45, creator: "User9012", description: "Lightning fast gains" },
];

type FilterTab = "all" | "trending" | "new" | "graduating";

export default function Home() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

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
        {mockTokens.map((token) => (
          <TokenCard key={token.id} {...token} />
        ))}
        {/* Additional Mock cards to fill grid */}
        {mockTokens.slice(0, 4).map((token) => (
          <TokenCard key={`${token.id}-dup`} {...token} />
        ))}
      </div>

      {/* Load More */}
      <div className="text-center mb-12">
        <button className="px-8 py-3 rounded-xl font-semibold border border-border hover:border-primary/50 hover:bg-white/5 transition-all text-sm">
          Load More Tokens ↓
        </button>
      </div>
    </div>
  );
}
