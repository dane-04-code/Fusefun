"use client";

import Link from "next/link";

interface TokenCardProps {
    id: string | number;
    name: string;
    ticker: string;
    image?: string;
    emoji?: string;
    marketCap: string;
    progress: number; // 0-100 for bonding curve progress
    volume24h?: string;
    isKing?: boolean;
    creator?: string;
    description?: string;
}

export function TokenCard({
    id,
    name,
    ticker,
    image,
    emoji,
    marketCap,
    progress,
    volume24h,
    isKing,
    creator,
    description,
}: TokenCardProps) {
    return (
        <Link href={`/token/${id}`}>
            <div
                className={`token-card group ${isKing ? "token-card-king" : ""}`}
            >
                {/* King Badge */}
                {isKing && (
                    <div className="absolute -top-2 -right-2 z-10">
                        <span className="king-crown">👑</span>
                    </div>
                )}

                {/* Token Image/Emoji */}
                <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isKing
                            ? "bg-gradient-to-br from-yellow-500/20 to-amber-600/20 ring-1 ring-yellow-500/30"
                            : "bg-gradient-to-br from-primary/20 to-emerald-600/20"
                        }`}>
                        {emoji || "🪙"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{ticker}</p>
                    </div>
                </div>

                {/* Description */}
                {description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {description}
                    </p>
                )}

                {/* Progress Bar */}
                <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Bonding Curve</span>
                        <span className={`font-medium ${progress >= 100 ? "text-green-400" : "text-foreground"}`}>
                            {progress}%
                        </span>
                    </div>
                    <div className="progress-bar h-1.5">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs">
                    <div>
                        <span className="text-muted-foreground">MC: </span>
                        <span className="text-green-400 font-semibold">{marketCap}</span>
                    </div>
                    {volume24h && (
                        <div>
                            <span className="text-muted-foreground">Vol: </span>
                            <span className="text-foreground">{volume24h}</span>
                        </div>
                    )}
                    {creator && !volume24h && (
                        <div>
                            <span className="text-muted-foreground">By: </span>
                            <span className="text-yellow-400">{creator}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
