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
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                    <WalletIcon className="w-12 h-12 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-heading font-bold mb-3">Connect Your Wallet</h1>
                <p className="text-muted-foreground mb-8">
                    Connect your Solana wallet to view your profile, portfolio, and trading activity.
                </p>
                <button
                    onClick={() => setVisible(true)}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all"
                >
                    Connect Wallet
                </button>
            </div>
        );
    }

    const address = publicKey?.toBase58() || "";

    return (
        <div className="max-w-5xl mx-auto">
            {/* Profile Header */}
            <div className="glass-card rounded-2xl p-6 mb-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-4xl shadow-lg shadow-primary/30">
                        🦊
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-xl font-heading font-bold mb-1">
                            {address.slice(0, 8)}...{address.slice(-8)}
                        </h1>
                        <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground">
                            <span>Joined Dec 2024</span>
                            <span>•</span>
                            <span>12 trades</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                            <div className="text-xl font-bold text-green-400">$858.35</div>
                            <div className="text-xs text-muted-foreground">Total Value</div>
                        </div>
                        <div>
                            <div className="text-xl font-bold text-foreground">3</div>
                            <div className="text-xs text-muted-foreground">Tokens Held</div>
                        </div>
                        <div>
                            <div className="text-xl font-bold text-blue-400">+45.2%</div>
                            <div className="text-xs text-muted-foreground">All-time PnL</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { id: "portfolio" as const, label: "Portfolio" },
                    { id: "activity" as const, label: "Activity" },
                    { id: "created" as const, label: "Created Tokens" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === "portfolio" && (
                <div className="glass-card rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead className="border-b border-border">
                            <tr className="text-xs text-muted-foreground">
                                <th className="text-left p-4">Token</th>
                                <th className="text-right p-4">Balance</th>
                                <th className="text-right p-4">Value</th>
                                <th className="text-right p-4">PnL</th>
                                <th className="text-right p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockPortfolio.map((token) => (
                                <tr key={token.id} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-600/20 flex items-center justify-center text-xl">
                                                {token.emoji}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{token.name}</div>
                                                <div className="text-xs text-muted-foreground">{token.ticker}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono text-sm">{token.balance}</td>
                                    <td className="p-4 text-right font-semibold">{token.value}</td>
                                    <td className={`p-4 text-right font-semibold ${token.pnl.startsWith("+") ? "text-green-400" : "text-red-400"
                                        }`}>
                                        {token.pnl}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                                            Trade
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === "activity" && (
                <div className="glass-card rounded-2xl p-4">
                    <div className="space-y-3">
                        {mockActivity.map((activity, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activity.type === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                    }`}>
                                    {activity.type === "buy" ? "↓" : "↑"}
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold">
                                        {activity.type === "buy" ? "Bought" : "Sold"} {activity.token}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{activity.amount} tokens</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold">{activity.value}</div>
                                    <div className="text-xs text-muted-foreground">{activity.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === "created" && (
                <div className="glass-card rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="font-heading font-semibold mb-2">No tokens created yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Launch your first token and it will appear here!
                    </p>
                    <a
                        href="/create"
                        className="inline-flex items-center gap-2 px-6 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                    >
                        Create Token →
                    </a>
                </div>
            )}
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
