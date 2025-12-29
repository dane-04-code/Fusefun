"use client";

import Link from "next/link";

// Mock data for demonstration - replace with real-time API data
const liveUpdates = [
    { id: 1, type: "launch", token: "PEPE2024", message: "just launched!", icon: "🚀", time: "2m ago" },
    { id: 2, type: "milestone", token: "DOGE3", message: "hit $100K market cap!", icon: "💎", time: "5m ago" },
    { id: 3, type: "migration", token: "MOON", message: "migrated to Raydium!", icon: "🌙", time: "8m ago" },
    { id: 4, type: "launch", token: "SOLCAT", message: "just launched!", icon: "🐱", time: "12m ago" },
    { id: 5, type: "milestone", token: "WOJAK", message: "hit $500K market cap!", icon: "📈", time: "15m ago" },
    { id: 6, type: "migration", token: "BONK2", message: "migrated to Raydium!", icon: "🎉", time: "18m ago" },
    { id: 7, type: "launch", token: "FROG", message: "just launched!", icon: "🐸", time: "20m ago" },
    { id: 8, type: "milestone", token: "SHIB3", message: "hit $1M market cap!", icon: "🔥", time: "25m ago" },
];

export function LiveTicker() {
    // Duplicate the items to create seamless loop
    const duplicatedUpdates = [...liveUpdates, ...liveUpdates];

    return (
        <div className="relative w-full bg-black/60 backdrop-blur-md border-b border-white/5 overflow-hidden">
            {/* Live Indicator */}
            <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-4 bg-gradient-to-r from-black via-black/80 to-transparent">
                <div className="flex items-center gap-2 pr-4">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Live</span>
                </div>
            </div>

            {/* Scrolling Ticker */}
            <div className="flex animate-scroll-left py-2.5">
                {duplicatedUpdates.map((update, index) => (
                    <Link
                        key={`${update.id}-${index}`}
                        href={`/token/${update.token.toLowerCase()}`}
                        className="flex items-center gap-2 px-6 text-sm whitespace-nowrap hover:text-primary transition-colors group"
                    >
                        <span className="text-base group-hover:scale-110 transition-transform">{update.icon}</span>
                        <span className="font-bold text-primary">${update.token}</span>
                        <span className="text-white/70">{update.message}</span>
                        <span className="text-white/40 text-xs">{update.time}</span>
                        <span className="text-white/20 mx-2">•</span>
                    </Link>
                ))}
            </div>

            {/* Right Fade */}
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent pointer-events-none" />
        </div>
    );
}
