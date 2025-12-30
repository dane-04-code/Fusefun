"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
    volume_24h?: number;
    progress?: number;
}

// Helper function to format volume/market cap
function formatValue(value: number): string {
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
}

export default function KingOfTheHillPage() {
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
                const allTokens: ApiToken[] = data.tokens || data || [];

                // Sort by 24h volume (highest first)
                const sortedByVolume = [...allTokens].sort(
                    (a, b) => (b.volume_24h || 0) - (a.volume_24h || 0)
                );

                setTokens(sortedByVolume);
            } catch (err) {
                console.error("Error fetching tokens:", err);
                setError(err instanceof Error ? err.message : "Failed to load tokens");
            } finally {
                setLoading(false);
            }
        }

        fetchTokens();
    }, []);

    // Get king (highest volume) and runners up (next 4)
    const king = tokens[0];
    const runnersUp = tokens.slice(1, 5);

    return (
        <div className="max-w-6xl mx-auto">
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
                    The token with the highest 24-hour trading volume claims the throne.
                </p>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading rankings...</p>
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-primary hover:bg-primary/90 rounded-lg font-bold"
                    >
                        Try Again
                    </button>
                </div>
            ) : tokens.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4 opacity-50">👑</div>
                    <p className="text-muted-foreground mb-4">No tokens yet. Be the first to create one!</p>
                    <Link href="/create" className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90">
                        Create Token
                    </Link>
                </div>
            ) : (
                <>
                    {/* Current King - Large Feature */}
                    {king && (
                        <Link href={`/trade/${king.mint}`} className="block">
                            <div className="king-card p-8 mb-8 cursor-pointer hover:border-yellow-500/50 transition-all">
                                <div className="relative z-10">
                                    <div className="flex flex-col lg:flex-row items-center gap-8">
                                        {/* King Token */}
                                        <div className="text-center lg:text-left">
                                            <div className="relative inline-block">
                                                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-6xl shadow-2xl shadow-yellow-500/40 overflow-hidden">
                                                    {king.image_uri ? (
                                                        <img src={king.image_uri} alt={king.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-5xl">🪙</span>
                                                    )}
                                                </div>
                                                <span className="absolute -top-4 -right-4 text-5xl king-crown">👑</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 text-center lg:text-left">
                                            <div className="inline-flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-full text-xs text-yellow-300 font-bold mb-2">
                                                #1 BY VOLUME
                                            </div>
                                            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-2">{king.name}</h2>
                                            <p className="text-xl text-yellow-400 font-mono">${king.symbol}</p>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 gap-8 text-center">
                                            <div className="bg-black/30 rounded-2xl p-6 min-w-[140px]">
                                                <div className="text-2xl md:text-3xl font-bold text-yellow-400">
                                                    {formatValue(king.volume_24h || 0)}
                                                </div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">24h Volume</div>
                                            </div>
                                            <div className="bg-black/30 rounded-2xl p-6 min-w-[140px]">
                                                <div className="text-2xl md:text-3xl font-bold text-blue-400">
                                                    {formatValue(king.market_cap || 0)}
                                                </div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Market Cap</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Runners Up - Top 4 */}
                    <div className="mb-8">
                        <h3 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                            <span className="text-purple-400">🏆</span> Contenders
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {runnersUp.map((token, index) => (
                                <Link key={token.mint} href={`/trade/${token.mint}`} className="block">
                                    <div className="boxy-card p-5 hover:border-purple-500/30 transition-all cursor-pointer group">
                                        <div className="flex items-center gap-4 mb-4">
                                            {/* Rank Badge */}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${index === 0 ? "bg-gray-400 text-black" :
                                                    index === 1 ? "bg-amber-700 text-white" :
                                                        "bg-muted text-muted-foreground"
                                                }`}>
                                                #{index + 2}
                                            </div>

                                            {/* Token Image */}
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
                                                {token.image_uri ? (
                                                    <img src={token.image_uri} alt={token.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl">🪙</span>
                                                )}
                                            </div>

                                            {/* Token Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold truncate">{token.name}</div>
                                                <div className="text-sm text-purple-400 font-mono">${token.symbol}</div>
                                            </div>
                                        </div>

                                        {/* Volume & Market Cap */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                                <div className="text-sm font-bold text-yellow-400">
                                                    {formatValue(token.volume_24h || 0)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">24h Vol</div>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-3 text-center">
                                                <div className="text-sm font-bold text-blue-400">
                                                    {formatValue(token.market_cap || 0)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">MCap</div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Full Rankings Table */}
                    {tokens.length > 5 && (
                        <div className="glass-card rounded-2xl overflow-hidden mb-10">
                            <div className="p-4 border-b border-white/10">
                                <h3 className="text-lg font-heading font-bold flex items-center gap-2">
                                    <span className="text-yellow-400">📊</span> Full Volume Rankings
                                </h3>
                            </div>
                            <table className="w-full">
                                <thead className="bg-white/5">
                                    <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                                        <th className="text-left p-4 font-medium">Rank</th>
                                        <th className="text-left p-4 font-medium">Token</th>
                                        <th className="text-right p-4 font-medium">24h Volume</th>
                                        <th className="text-right p-4 font-medium">Market Cap</th>
                                        <th className="text-right p-4 font-medium">Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tokens.slice(5).map((token, index) => (
                                        <tr key={token.mint} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                                                    {index + 6}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Link href={`/trade/${token.mint}`} className="flex items-center gap-3 hover:opacity-80">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center overflow-hidden">
                                                        {token.image_uri ? (
                                                            <img src={token.image_uri} alt={token.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-lg">🪙</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{token.name}</div>
                                                        <div className="text-xs text-muted-foreground font-mono">${token.symbol}</div>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="font-bold text-yellow-400">{formatValue(token.volume_24h || 0)}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="font-mono">{formatValue(token.market_cap || 0)}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full"
                                                            style={{ width: `${token.progress || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground w-10">{token.progress || 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* How to Become King */}
                    <div className="boxy-card p-6">
                        <h3 className="text-lg font-heading font-bold mb-6 flex items-center gap-2">
                            <span>👑</span> How to Become King
                        </h3>
                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { icon: "📈", title: "Generate Volume", desc: "Trade and encourage trading to increase your token's 24h volume" },
                                { icon: "🏆", title: "Claim the Throne", desc: "The token with highest 24h volume automatically becomes King" },
                                { icon: "✨", title: "Enjoy Benefits", desc: "Get featured placement, more visibility, and attract more traders" },
                            ].map((step, i) => (
                                <div key={i} className="text-center p-4 bg-black/20 rounded-xl">
                                    <div className="text-4xl mb-3">{step.icon}</div>
                                    <h4 className="font-semibold mb-2">{step.title}</h4>
                                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
