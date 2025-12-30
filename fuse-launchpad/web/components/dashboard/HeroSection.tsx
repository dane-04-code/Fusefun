"use client";

import { useEffect, useState } from "react";
import { TokenRow } from "./TokenRow";

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
    graduated?: boolean;
}

// Helper function to format market cap
function formatMarketCap(value: number): string {
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
}

// Transform API token to TokenRow props
function tokenToRowProps(token: ApiToken, options?: { statusLabel?: string; statusColor?: string }) {
    return {
        name: token.name,
        ticker: `$${token.symbol}`,
        marketCap: formatMarketCap(token.market_cap || 0),
        change: options?.statusLabel || `${Math.floor(Math.random() * 10) + 1}%`,
        isPositive: true,
        image: token.image_uri,
        statusLabel: options?.statusLabel,
        statusColor: options?.statusColor,
    };
}

export function HeroSection() {
    const [newlyCreated, setNewlyCreated] = useState<ApiToken[]>([]);
    const [graduating, setGraduating] = useState<ApiToken[]>([]);
    const [listed, setListed] = useState<ApiToken[]>([]);
    const [diamonds, setDiamonds] = useState<ApiToken[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch all tokens
                const response = await fetch("/api/tokens");
                if (!response.ok) throw new Error("Failed to fetch tokens");
                const data = await response.json();
                const allTokens: ApiToken[] = data.tokens || data || [];

                // Sort by created_at for newly created (newest first)
                const sortedByDate = [...allTokens].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setNewlyCreated(sortedByDate.slice(0, 3));

                // Filter graduating tokens (progress >= 70% but not graduated)
                const graduatingTokens = allTokens
                    .filter((t) => (t.progress || 0) >= 70 && !t.graduated)
                    .sort((a, b) => (b.progress || 0) - (a.progress || 0));
                setGraduating(graduatingTokens.slice(0, 3));

                // Filter listed/graduated tokens
                const listedTokens = allTokens.filter((t) => t.graduated);
                setListed(listedTokens.slice(0, 3));

                // Diamonds: highest market cap tokens
                const sortedByMcap = [...allTokens].sort(
                    (a, b) => (b.market_cap || 0) - (a.market_cap || 0)
                );
                setDiamonds(sortedByMcap.slice(0, 3));
            } catch (err) {
                console.error("Error fetching hero data:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);
    return (
        <section className="mb-12 relative overflow-hidden">
            {/* Background elements if needed */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-primary/5 blur-[100px] pointer-events-none" />

            {/* Title */}
            <div className="text-center mb-10 relative z-10">
                <span className="text-sm font-mono text-primary mb-2 block tracking-widest uppercase">Market Today</span>
                <h1 className="text-2xl md:text-3xl lg:text-4xl mb-6 max-w-4xl mx-auto leading-relaxed">
                    <span className="block mb-2 text-white/80">The</span>
                    <span
                        className="blocky-glitch-title text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-cyan-400"
                        data-text="Fairest Launchpad"
                    >
                        Fairest Launchpad
                    </span>
                    <span className="block mt-2 text-white/80">on Solana</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                    Create and trade on the fairest memecoin launchpad on Solana.
                </p>
            </div>

            {/* 4-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
                {/* 1. Newly Created */}
                <div className="boxy-card p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <span className="text-xl">👀</span>
                        <h3 className="font-bold text-sm text-foreground/80">Newly Created</h3>
                    </div>
                    {loading ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
                    ) : newlyCreated.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">No tokens yet</div>
                    ) : (
                        newlyCreated.map((token, i) => (
                            <TokenRow key={i} {...tokenToRowProps(token)} price="0.00" />
                        ))
                    )}
                </div>

                {/* 2. Graduating */}
                <div className="boxy-card p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <span className="text-xl">🎓</span>
                        <h3 className="font-bold text-sm text-foreground/80">Graduating</h3>
                    </div>
                    {loading ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
                    ) : graduating.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">No graduating tokens</div>
                    ) : (
                        graduating.map((token, i) => (
                            <TokenRow key={i} {...tokenToRowProps(token)} price="0.00" />
                        ))
                    )}
                </div>

                {/* 3. Listed on Raydium */}
                <div className="boxy-card p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <span className="text-xl">🪐</span>
                        <h3 className="font-bold text-sm text-foreground/80">Listed on Raydium</h3>
                    </div>
                    {loading ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
                    ) : listed.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">No listed tokens</div>
                    ) : (
                        listed.map((token, i) => (
                            <TokenRow
                                key={i}
                                {...tokenToRowProps(token, { statusLabel: "listed", statusColor: "text-blue-400" })}
                                price="0.00"
                            />
                        ))
                    )}
                </div>

                {/* 4. Diamonds */}
                <div className="boxy-card p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <span className="text-xl">💎</span>
                        <h3 className="font-bold text-sm text-foreground/80">Diamonds</h3>
                    </div>
                    {loading ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
                    ) : diamonds.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">No tokens yet</div>
                    ) : (
                        diamonds.map((token, i) => (
                            <TokenRow
                                key={i}
                                {...tokenToRowProps(token, { statusLabel: "top", statusColor: "text-orange-400" })}
                                price="0.00"
                            />
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
