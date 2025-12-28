"use client";

import Link from "next/link";

interface KingData {
    id: string | number;
    name: string;
    ticker: string;
    emoji?: string;
    image?: string;
    volume24h: string;
    marketCap: string;
    holders: string;
    gain: string;
    transactions?: string;
}

interface KingHillSectionProps {
    king: KingData;
}

export function KingHillSection({ king }: KingHillSectionProps) {
    return (
        <section className="mb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="king-crown text-3xl">👑</span>
                    <div>
                        <h2 className="text-xl font-heading font-bold text-foreground">
                            King of the Hill
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Highest 24h volume claims the throne
                        </p>
                    </div>
                </div>
                <Link
                    href="/king-of-the-hill"
                    className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                    View All
                    <ArrowRightIcon className="w-4 h-4" />
                </Link>
            </div>

            {/* King Card */}
            <Link href={`/token/${king.id}`}>
                <div className="king-card p-6 hover-lift cursor-pointer">
                    <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6">
                        {/* Token Info */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-5xl shadow-lg shadow-yellow-500/30">
                                {king.emoji || "🏆"}
                            </div>
                            <div>
                                <h3 className="text-2xl lg:text-3xl font-heading font-bold text-foreground">
                                    {king.name}
                                </h3>
                                <p className="text-lg text-yellow-400 font-medium">{king.ticker}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-green-400 font-semibold">
                                        {king.gain}
                                    </span>
                                    <span className="text-xs text-muted-foreground">24h</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full lg:w-auto">
                            <StatBox
                                label="24h Volume"
                                value={king.volume24h}
                                color="yellow"
                            />
                            <StatBox
                                label="Market Cap"
                                value={king.marketCap}
                                color="blue"
                            />
                            <StatBox
                                label="Holders"
                                value={king.holders}
                                color="green"
                            />
                            <StatBox
                                label="Transactions"
                                value={king.transactions || "128K"}
                                color="purple"
                            />
                        </div>
                    </div>

                    {/* Mini Chart Placeholder */}
                    <div className="relative z-10 mt-6 pt-6 border-t border-yellow-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Price Chart (24h)</span>
                            <span className="text-xs text-green-400 font-medium">+24.5%</span>
                        </div>
                        <div className="h-16 bg-black/20 rounded-xl flex items-end justify-around p-2 gap-1">
                            {/* Fake chart bars */}
                            {Array.from({ length: 24 }).map((_, i) => {
                                const height = 20 + Math.random() * 60;
                                const isGreen = Math.random() > 0.3;
                                return (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-sm ${isGreen ? "bg-green-500/60" : "bg-red-500/60"
                                            }`}
                                        style={{ height: `${height}%` }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </Link>
        </section>
    );
}

interface StatBoxProps {
    label: string;
    value: string;
    color: "yellow" | "blue" | "green" | "purple";
}

function StatBox({ label, value, color }: StatBoxProps) {
    const colorClasses = {
        yellow: "text-yellow-400",
        blue: "text-blue-400",
        green: "text-green-400",
        purple: "text-purple-400",
    };

    return (
        <div className="text-center lg:text-left">
            <div className={`text-xl lg:text-2xl font-bold ${colorClasses[color]}`}>
                {value}
            </div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );
}
