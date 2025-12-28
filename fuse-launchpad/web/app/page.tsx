"use client";

import { useState } from "react";
import { TokenCard } from "@/components/dashboard/TokenCard";
import { KingHillSection } from "@/components/dashboard/KingHillSection";

// Mock data
const kingData = {
  id: "bonk",
  name: "WowDogecoin",
  ticker: "$WDOGE",
  emoji: "🐕",
  volume24h: "$4.2M",
  marketCap: "$12.5M",
  holders: "45,892",
  gain: "+1,247%",
  transactions: "128K",
};

const trendingTokens = [
  { id: "1", name: "ShibaInu", ticker: "$SHIB", emoji: "🦊", marketCap: "$21.23M", progress: 85, volume24h: "$1.2M" },
  { id: "2", name: "PepeBNB", ticker: "$PEPE", emoji: "🐸", marketCap: "$63,921", progress: 65 },
  { id: "3", name: "MoonCat", ticker: "$MCAT", emoji: "🐱", marketCap: "$78.5K", progress: 42, creator: "User8123" },
];

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
    <div className="max-w-7xl mx-auto">
      {/* Ticker */}
      <div className="ticker-wrap rounded-xl mb-6 overflow-hidden">
        <div className="ticker-content">
          <span className="ticker-item text-yellow-400">👑 $WDOGE is King of the Hill! $4.2M 24h volume</span>
          <span className="ticker-item text-green-400">🚀 New token launching every minute</span>
          <span className="ticker-item text-blue-400">💎 3 tokens graduating today</span>
          <span className="ticker-item text-purple-400">⚡ Live on Solana Mainnet</span>
          <span className="ticker-item text-pink-400">🔥 $2.5M total volume today</span>
          <span className="ticker-item text-green-400">✨ Fair launch - No presale, No team tokens</span>
          <span className="ticker-item text-cyan-400">🛡️ Anti-rug protection enabled</span>
          {/* Duplicate for seamless loop */}
          <span className="ticker-item text-yellow-400">👑 $WDOGE is King of the Hill! $4.2M 24h volume</span>
          <span className="ticker-item text-green-400">🚀 New token launching every minute</span>
          <span className="ticker-item text-blue-400">💎 3 tokens graduating today</span>
          <span className="ticker-item text-purple-400">⚡ Live on Solana Mainnet</span>
        </div>
      </div>

      {/* Trending Now Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🔥</span>
          <h2 className="text-xl font-heading font-bold">Trending Now</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trendingTokens.map((token, index) => (
            <TokenCard
              key={token.id}
              {...token}
              isKing={index === 0}
            />
          ))}
        </div>
      </section>

      {/* King of the Hill */}
      <KingHillSection king={kingData} />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex bg-muted/50 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="ml-auto">
          <select className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="mcap">Top MC</option>
            <option value="volume">Volume</option>
            <option value="newest">Newest</option>
            <option value="progress">Progress</option>
          </select>
        </div>
      </div>

      {/* Token Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {mockTokens.map((token) => (
          <TokenCard key={token.id} {...token} />
        ))}
      </div>

      {/* Load More */}
      <div className="text-center mb-12">
        <button className="px-8 py-3 rounded-xl font-semibold border border-border hover:border-primary/50 hover:bg-white/5 transition-all">
          Load More Tokens ↓
        </button>
      </div>
    </div>
  );
}
