"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

// Mock data
const mockPortfolio = [
    { id: "1", name: "PepeSol", ticker: "$PSOL", emoji: "🐸", balance: "1,234,567", value: "$456.78", pnl: "+23.5%" },
    { id: "2", name: "MoonCat", ticker: "$MCAT", emoji: "🐱", balance: "890,000", value: "$312.45", pnl: "+156.2%" },
    { id: "3", name: "FireDog", ticker: "$FDOG", emoji: "🐕", balance: "2,500,000", value: "$89.12", pnl: "-12.3%" },
];

const mockActivity = [
    { type: "buy", token: "PepeSol", amount: "100,000", value: "$45.67", time: "2h ago" },
    { type: "sell", token: "MoonCat", amount: "50,000", value: "$89.23", time: "5h ago" },
    { type: "buy", token: "FireDog", amount: "500,000", value: "$34.12", time: "1d ago" },
];

export default function ProfilePage() {
    const { connected, publicKey, disconnect } = useWallet();
    const { setVisible } = useWalletModal();
    const [activeTab, setActiveTab] = useState<"portfolio" | "activity" | "created">("portfolio");

    if (!connected) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10">
                    <WalletIcon className="w-12 h-12 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-heading font-bold mb-3">Connect Your Wallet</h1>
                <p className="text-muted-foreground mb-8 text-lg">
                    Connect your Solana wallet to view your profile, portfolio, and trading activity.
                </p>
                <button
                    onClick={() => setVisible(true)}
                    className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
                >
                    Connect Wallet
                </button>
            </div>
        );
    }

    const address = publicKey?.toBase58() || "";

    return (
        <div className="max-w-5xl mx-auto pt-8">
            {/* Profile Header */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 mb-8">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] pointer-events-none" />

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-5xl shadow-2xl shadow-primary/20 ring-4 ring-black/50">
                        🦊
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2 tracking-tight">
                            {address.slice(0, 6)}...{address.slice(-6)}
                        </h1>
                        <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                            <span className="bg-white/5 px-3 py-1 rounded-full border border-white/5">Joined Dec 2024</span>
                            <span className="bg-white/5 px-3 py-1 rounded-full border border-white/5">12 trades</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-8 text-center bg-black/20 p-6 rounded-2xl border border-white/5">
                        <div>
                            <div className="text-2xl font-bold text-green-400">$858.35</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Total Value</div>
                        </div>
                        <div className="border-l border-white/5 pl-8">
                            <div className="text-2xl font-bold text-foreground">3</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Tokens</div>
                        </div>
                        <div className="border-l border-white/5 pl-8">
                            <div className="text-2xl font-bold text-blue-400">+45.2%</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">PnL</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 p-1 bg-black/20 rounded-xl w-fit border border-white/5">
                {[
                    { id: "portfolio" as const, label: "Portfolio" },
                    { id: "activity" as const, label: "Activity" },
                    { id: "created" as const, label: "Created Tokens" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === "portfolio" && (
                    <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                                    <th className="text-left p-6 font-medium">Token</th>
                                    <th className="text-right p-6 font-medium">Balance</th>
                                    <th className="text-right p-6 font-medium">Value</th>
                                    <th className="text-right p-6 font-medium">PnL</th>
                                    <th className="text-right p-6 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockPortfolio.map((token) => (
                                    <tr key={token.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                    {token.emoji}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg">{token.name}</div>
                                                    <div className="text-sm text-blue-400 font-mono">{token.ticker}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right font-mono text-base">{token.balance}</td>
                                        <td className="p-6 text-right font-bold text-base">{token.value}</td>
                                        <td className={`p-6 text-right font-bold text-base ${token.pnl.startsWith("+") ? "text-green-400" : "text-red-400"
                                            }`}>
                                            {token.pnl}
                                        </td>
                                        <td className="p-6 text-right">
                                            <button className="px-4 py-2 text-xs font-bold bg-white/5 text-foreground rounded-lg hover:bg-primary hover:text-black hover:shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all">
                                                TRADE
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "activity" && (
                    <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-2">
                        <div className="space-y-1">
                            {mockActivity.map((activity, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 ${activity.type === "buy" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                        }`}>
                                        <div className="group-hover:scale-110 transition-transform">
                                            {activity.type === "buy" ? "↙" : "↗"}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-base">
                                            {activity.type === "buy" ? "Bought" : "Sold"} <span className={activity.type === 'buy' ? 'text-green-400' : 'text-red-400'}>{activity.token}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground font-mono">{activity.amount} tokens</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">{activity.value}</div>
                                        <div className="text-xs text-muted-foreground">{activity.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "created" && (
                    <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-12 text-center">
                        <div className="text-6xl mb-6 opacity-50">📝</div>
                        <h3 className="text-xl font-heading font-bold mb-2">No tokens created yet</h3>
                        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                            Launch your first token today and start building your community on the fairest launchpad.
                        </p>
                        <a
                            href="/create"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all"
                        >
                            Create Token →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

function WalletIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
        </svg>
    );
}
