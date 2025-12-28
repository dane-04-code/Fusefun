"use client";

import { useState } from "react";
import { TokenCard } from "@/components/dashboard/TokenCard";

// Mock data for rankings
const contestant = [
    { id: "1", name: "WowDogecoin", ticker: "$WDOGE", emoji: "🐕", marketCap: "$12.5M", volume24h: "$4.2M", progress: 100, gain: "+1,247%", isKing: true },
    { id: "2", name: "ShibaInu", ticker: "$SHIB", emoji: "🦊", marketCap: "$8.2M", volume24h: "$2.1M", progress: 92, gain: "+892%" },
    { id: "3", name: "PepeBNB", ticker: "$PEPE", emoji: "🐸", marketCap: "$5.1M", volume24h: "$1.5M", progress: 85, gain: "+654%" },
    { id: "4", name: "MoonCat", ticker: "$MCAT", emoji: "🐱", marketCap: "$3.2M", volume24h: "$890K", progress: 78, gain: "+423%" },
    { id: "5", name: "CyberApe", ticker: "$CAPE", emoji: "🦍", marketCap: "$2.8M", volume24h: "$720K", progress: 72, gain: "+367%" },
    { id: "6", name: "RocketShip", ticker: "$ROCKET", emoji: "🚀", marketCap: "$2.1M", volume24h: "$560K", progress: 65, gain: "+289%" },
];

const topGainers = [
    { id: "g1", name: "MegaMoon", ticker: "$MEGA", emoji: "🌙", marketCap: "$180K", progress: 45, gain: "+2,450%" },
    { id: "g2", name: "TurboFrog", ticker: "$TURBO", emoji: "🐸", marketCap: "$92K", progress: 38, gain: "+1,890%" },
    { id: "g3", name: "NeonCat", ticker: "$NEON", emoji: "😺", marketCap: "$145K", progress: 52, gain: "+1,567%" },
];

export default function KingOfTheHillPage() {
    const king = contestant[0];

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2 mb-4">
                    <span className="king-crown text-2xl">👑</span>
                    <span className="text-sm text-yellow-300 font-medium">Champion's Arena</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3">
                    King of the <span className="gradient-text-gold">Hill</span>
                </h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    The token with the highest 24h trading volume claims the throne.
                    Compete for the crown and earn maximum visibility!
                </p>
            </div>

            {/* Current King - Large Feature */}
            <div className="king-card p-8 mb-10">
                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                        {/* King Token */}
                        <div className="text-center lg:text-left">
                            <div className="relative inline-block">
                                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-6xl shadow-2xl shadow-yellow-500/40">
                                    {king.emoji}
                                </div>
                                <span className="absolute -top-4 -right-4 text-5xl king-crown">👑</span>
                            </div>
                        </div>

                        <div className="flex-1 text-center lg:text-left">
                            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-2">{king.name}</h2>
                            <p className="text-xl text-yellow-400 mb-4">{king.ticker}</p>
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                                    ↑ {king.gain}
                                </span>
                                <span className="text-muted-foreground text-sm">Crowned 2h ago</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="text-center">
                                <div className="text-2xl md:text-3xl font-bold text-yellow-400">{king.volume24h}</div>
                                <div className="text-xs text-muted-foreground">24h Volume</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl md:text-3xl font-bold text-blue-400">{king.marketCap}</div>
                                <div className="text-xs text-muted-foreground">Market Cap</div>
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="mt-8 pt-8 border-t border-yellow-500/20">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-semibold">Price Chart</h3>
                            <div className="flex gap-2">
                                {["1H", "4H", "1D", "1W"].map((period) => (
                                    <button
                                        key={period}
                                        className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {period}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-48 bg-black/30 rounded-xl flex items-end justify-around p-4 gap-1">
                            {Array.from({ length: 48 }).map((_, i) => {
                                const height = 30 + Math.random() * 50 + (i / 48) * 20;
                                const isGreen = Math.random() > 0.3;
                                return (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-sm transition-all hover:opacity-80 ${isGreen ? "bg-green-500/70" : "bg-red-500/70"
                                            }`}
                                        style={{ height: `${height}%` }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Rankings Section */}
            <div className="grid lg:grid-cols-3 gap-6 mb-10">
                {/* 24h Trading Volume Ranking */}
                <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                    <h3 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                        <span className="text-yellow-400">📊</span> 24h Trading Volume Ranking
                    </h3>
                    <div className="space-y-3">
                        {contestant.map((token, index) => (
                            <div
                                key={token.id}
                                className={`flex items-center gap-4 p-3 rounded-xl transition-all ${index === 0
                                        ? "bg-yellow-500/10 border border-yellow-500/30"
                                        : "hover:bg-white/5"
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${index === 0 ? "bg-yellow-500 text-black" :
                                        index === 1 ? "bg-gray-400 text-black" :
                                            index === 2 ? "bg-amber-700 text-white" :
                                                "bg-muted text-muted-foreground"
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-600/20 flex items-center justify-center text-xl">
                                    {token.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{token.name}</div>
                                    <div className="text-xs text-muted-foreground">{token.ticker}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-yellow-400">{token.volume24h}</div>
                                    <div className="text-xs text-green-400">{token.gain}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Gainers */}
                <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                        <span className="text-green-400">🚀</span> Top Gainers
                    </h3>
                    <div className="space-y-3">
                        {topGainers.map((token, index) => (
                            <div
                                key={token.id}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center text-xl">
                                    {token.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm truncate">{token.name}</div>
                                    <div className="text-xs text-muted-foreground">{token.ticker}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-green-400">{token.gain}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* How to Become King */}
            <div className="glass-card rounded-2xl p-6 mb-10">
                <h3 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                    <span>👑</span> How to Become King
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        { icon: "📈", title: "Generate Volume", desc: "Trade and encourage trading to increase your token's 24h volume" },
                        { icon: "🏆", title: "Claim the Throne", desc: "The token with highest 24h volume automatically becomes King" },
                        { icon: "✨", title: "Enjoy Benefits", desc: "Get featured placement, more visibility, and attract more traders" },
                    ].map((step, i) => (
                        <div key={i} className="text-center">
                            <div className="text-4xl mb-3">{step.icon}</div>
                            <h4 className="font-semibold mb-2">{step.title}</h4>
                            <p className="text-sm text-muted-foreground">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
