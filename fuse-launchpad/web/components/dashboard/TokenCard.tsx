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
        <Link href={`/trade/${id}`}>
            <div
                className={`group relative bg-black/40 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-sm p-4 ${isKing ? "border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]" : ""}`}
            >
                {/* Tech Corners */}
                <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/20 group-hover:border-blue-400 transition-colors" />
                <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-white/20 group-hover:border-blue-400 transition-colors" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-white/20 group-hover:border-blue-400 transition-colors" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/20 group-hover:border-blue-400 transition-colors" />

                {/* King Badge */}
                {isKing && (
                    <div className="absolute -top-3 -right-3 z-10 bg-black border border-yellow-500/50 p-1.5 shadow-lg">
                        <span className="text-xl">👑</span>
                    </div>
                )}

                {/* Token Header */}
                <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 flex items-center justify-center text-2xl bg-slate-900 border border-slate-700 group-hover:border-blue-500/50 transition-colors ${isKing ? "ring-1 ring-yellow-500/30" : ""
                        }`}>
                        {emoji || "🪙"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-lg text-white group-hover:text-blue-400 transition-colors truncate">
                            {name}
                        </h3>
                        <p className="text-sm text-slate-400 font-mono">{ticker}</p>
                    </div>
                </div>

                {/* Description */}
                {description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-mono">
                        {description}
                    </p>
                )}

                {/* Bonding Curve Progress */}
                <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                        <span className="text-slate-500">BONDING CURVE</span>
                        <span className={`${progress >= 100 ? "text-green-400" : "text-blue-400"}`}>
                            {progress}%
                        </span>
                    </div>
                    <div className="h-2 bg-slate-900 border border-slate-800">
                        <div
                            className={`h-full transition-all duration-500 ${progress >= 100 ? "bg-green-500" : "bg-blue-600"
                                }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-slate-800/50 pt-3">
                    <div>
                        <span className="text-slate-500 block">MCAP</span>
                        <span className="text-green-400 font-bold">{marketCap}</span>
                    </div>
                    {volume24h ? (
                        <div className="text-right">
                            <span className="text-slate-500 block">VOL 24H</span>
                            <span className="text-white font-bold">{volume24h}</span>
                        </div>
                    ) : (
                        <div className="text-right">
                            <span className="text-slate-500 block">CREATOR</span>
                            <span className="text-slate-300 truncate">{creator || "Anon"}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
