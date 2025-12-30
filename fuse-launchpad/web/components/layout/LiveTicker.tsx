"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface TokenUpdate {
    id: string;
    type: "launch" | "milestone" | "migration";
    token: string;
    mint: string;
    message: string;
    icon: string;
    time: string;
}

// Format time ago
function timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// Format market cap
function formatMarketCap(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
}

export function LiveTicker() {
    const [updates, setUpdates] = useState<TokenUpdate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTokens() {
            try {
                const response = await fetch("/api/tokens?limit=20");
                if (!response.ok) throw new Error("Failed to fetch");
                const data = await response.json();
                const tokens = data.tokens || data || [];

                // Transform tokens into ticker updates
                const tokenUpdates: TokenUpdate[] = tokens.map((token: any, index: number) => {
                    const createdAt = token.created_at || token.createdAt || Date.now();
                    const marketCap = token.market_cap || token.marketCap || 0;
                    const isGraduated = token.complete || token.graduated;

                    // Determine update type based on token state
                    let type: "launch" | "milestone" | "migration" = "launch";
                    let message = "just launched!";
                    let icon = "🚀";

                    if (isGraduated) {
                        type = "migration";
                        message = "migrated to Raydium!";
                        icon = "🎉";
                    } else if (marketCap >= 100000) {
                        type = "milestone";
                        message = `hit ${formatMarketCap(marketCap)} market cap!`;
                        icon = marketCap >= 500000 ? "🔥" : "💎";
                    } else if (marketCap >= 50000) {
                        type = "milestone";
                        message = `hit ${formatMarketCap(marketCap)} market cap!`;
                        icon = "📈";
                    }

                    return {
                        id: token.mint || `token-${index}`,
                        type,
                        token: token.symbol || "TOKEN",
                        mint: token.mint || "",
                        message,
                        icon,
                        time: timeAgo(createdAt),
                    };
                });

                setUpdates(tokenUpdates.length > 0 ? tokenUpdates : getDefaultUpdates());
            } catch (error) {
                console.error("Failed to fetch tokens for ticker:", error);
                setUpdates(getDefaultUpdates());
            } finally {
                setLoading(false);
            }
        }

        fetchTokens();
        // Refresh every 30 seconds
        const interval = setInterval(fetchTokens, 30000);
        return () => clearInterval(interval);
    }, []);

    // Default updates when no tokens exist
    function getDefaultUpdates(): TokenUpdate[] {
        return [
            { id: "1", type: "launch", token: "DEMO", mint: "FakE1234567890abcdefghijkLMNopqrstuVWXyz12", message: "just launched!", icon: "🚀", time: "now" },
            { id: "2", type: "milestone", token: "FUSE", mint: "", message: "platform is live!", icon: "🎉", time: "today" },
            { id: "3", type: "launch", token: "CREATE", mint: "", message: "your token now!", icon: "💎", time: "" },
        ];
    }

    // Duplicate the items to create seamless loop
    const duplicatedUpdates = [...updates, ...updates];

    return (
        <div className="relative w-full overflow-hidden">
            {/* Rainbow Gradient Background */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(90deg, #9333ea 0%, #ec4899 15%, #f97316 30%, #eab308 45%, #22c55e 60%, #06b6d4 75%, #3b82f6 90%, #9333ea 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'gradient-shift 8s linear infinite',
                }}
            />

            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Live Indicator */}
            <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-4 bg-gradient-to-r from-black/80 via-black/60 to-transparent">
                <div className="flex items-center gap-2 pr-4">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Live</span>
                </div>
            </div>

            {/* Scrolling Ticker */}
            <div className="relative flex animate-scroll-left py-2">
                {loading ? (
                    <div className="flex items-center gap-2 px-5 text-sm whitespace-nowrap text-white/60">
                        Loading live updates...
                    </div>
                ) : (
                    duplicatedUpdates.map((update, index) => (
                        <Link
                            key={`${update.id}-${index}`}
                            href={update.mint ? `/trade/${update.mint}` : "/create"}
                            className="flex items-center gap-2 px-5 text-sm whitespace-nowrap hover:scale-105 transition-transform group"
                        >
                            <span className="text-base drop-shadow-lg">{update.icon}</span>
                            <span className="font-bold text-white drop-shadow-md">${update.token}</span>
                            <span className="text-white/90 drop-shadow-sm">{update.message}</span>
                            {update.time && <span className="text-white/60 text-xs">{update.time}</span>}
                            <span className="text-white/40 mx-2">•</span>
                        </Link>
                    ))
                )}
            </div>

            {/* Right Fade */}
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-10" />
        </div>
    );
}
