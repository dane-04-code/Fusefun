"use client";

import Image from "next/image";
import { TrendingUp, User } from "lucide-react";

interface TokenRowProps {
    rank?: number;
    name: string;
    ticker: string;
    price: string;
    change: string;
    marketCap?: string;
    isPositive?: boolean;
    image?: string;
    statusLabel?: string;
    statusColor?: string;
}

export function TokenRow({
    rank,
    name,
    ticker,
    price,
    change,
    marketCap,
    isPositive = true,
    image,
    statusLabel,
    statusColor = "text-blue-400"
}: TokenRowProps) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5">
            {/* Rank or Icon */}
            {rank ? (
                <span className="text-sm font-mono text-muted-foreground w-4">{rank}</span>
            ) : null}

            {/* Image */}
            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                {image ? (
                    <Image src={image} alt={name} fill className="object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-xs font-bold text-blue-400">
                        {ticker.slice(0, 2)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground truncate">{name}</h4>
                    {statusLabel && (
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${statusColor}`}>
                            {statusLabel}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{ticker}</span>
                    {marketCap && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                            <span className="font-mono">MC: {marketCap}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Stats */}
            {change && (
                <div className="text-right">
                    <div className={`text-xs font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {change}
                    </div>
                </div>
            )}
        </div>
    );
}
