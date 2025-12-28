"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

// Mock data
const referralStats = {
    totalEarnings: "$6078.76",
    pendingRewards: "$234.50",
    referralCount: 47,
    conversionRate: "80%",
};

const leaderboard = [
    { rank: 1, address: "8xK4...9d2F", referrals: 234, earnings: "$12,450" },
    { rank: 2, address: "3mN7...4kL1", referrals: 189, earnings: "$9,870" },
    { rank: 3, address: "6pQ2...8nM3", referrals: 156, earnings: "$7,230" },
    { rank: 4, address: "9rT5...2jK7", referrals: 123, earnings: "$5,890" },
    { rank: 5, address: "1wX8...6hY4", referrals: 98, earnings: "$4,560" },
];

const recentReferrals = [
    { address: "4aB2...7xC9", date: "2h ago", status: "completed", reward: "$50" },
    { address: "8dE5...3fG1", date: "5h ago", status: "pending", reward: "$50" },
    { address: "2hI4...9jK6", date: "1d ago", status: "completed", reward: "$50" },
];

export default function RewardsPage() {
    const { connected, publicKey } = useWallet();
    const [copied, setCopied] = useState(false);

    const referralLink = connected && publicKey
        ? `https://fusey.fun/?ref=${publicKey.toBase58().slice(0, 8)}`
        : "Connect wallet to get link";

    const copyToClipboard = () => {
        if (connected) {
            navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-2 mb-4">
                    <span className="text-xl">🎁</span>
                    <span className="text-sm text-purple-300 font-medium">Earn Rewards</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3">
                    Invite Friends, <span className="gradient-text">Earn Rewards</span>
                </h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    Share your referral link and earn rewards when your friends trade on Fusey.
                    The more they trade, the more you earn!
                </p>
            </div>

            {/* Referral Link Card */}
            <div className="glass-card rounded-2xl p-6 mb-8">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                        <label className="text-sm text-muted-foreground mb-2 block">Your Referral Link</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={referralLink}
                                readOnly
                                className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground text-sm font-mono"
                            />
                            <button
                                onClick={copyToClipboard}
                                disabled={!connected}
                                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Share Buttons */}
                <div className="flex items-center gap-3 mt-4">
                    <span className="text-sm text-muted-foreground">Share on:</span>
                    <button className="p-2 rounded-lg bg-[#1DA1F2]/20 text-[#1DA1F2] hover:bg-[#1DA1F2]/30 transition-colors">
                        <TwitterIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 rounded-lg bg-[#0088cc]/20 text-[#0088cc] hover:bg-[#0088cc]/30 transition-colors">
                        <TelegramIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card rounded-2xl p-6 text-center">
                    <div className="text-3xl font-bold text-green-400 mb-1">{referralStats.totalEarnings}</div>
                    <div className="text-sm text-muted-foreground">Total Earnings</div>
                </div>
                <div className="glass-card rounded-2xl p-6 text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-1">{referralStats.pendingRewards}</div>
                    <div className="text-sm text-muted-foreground">Pending Rewards</div>
                </div>
                <div className="glass-card rounded-2xl p-6 text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-1">{referralStats.referralCount}</div>
                    <div className="text-sm text-muted-foreground">Total Referrals</div>
                </div>
                <div className="glass-card rounded-2xl p-6 text-center">
                    <div className="relative inline-block">
                        <svg className="w-16 h-16 transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-muted" />
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none"
                                strokeDasharray={`${80 * 1.76} 176`} className="text-green-400" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">{referralStats.conversionRate}</div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Conversion Rate</div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
                {/* Leaderboard */}
                <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                        <span className="text-yellow-400">🏆</span> Top Referrers
                    </h3>
                    <div className="space-y-3">
                        {leaderboard.map((user) => (
                            <div
                                key={user.rank}
                                className={`flex items-center gap-4 p-3 rounded-xl ${user.rank <= 3 ? "bg-yellow-500/10" : "hover:bg-white/5"
                                    } transition-colors`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${user.rank === 1 ? "bg-yellow-500 text-black" :
                                        user.rank === 2 ? "bg-gray-400 text-black" :
                                            user.rank === 3 ? "bg-amber-700 text-white" :
                                                "bg-muted text-muted-foreground"
                                    }`}>
                                    {user.rank}
                                </div>
                                <div className="flex-1">
                                    <div className="font-mono text-sm">{user.address}</div>
                                    <div className="text-xs text-muted-foreground">{user.referrals} referrals</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-green-400">{user.earnings}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Referrals */}
                <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
                        <span className="text-green-400">👥</span> Recent Referrals
                    </h3>
                    {connected ? (
                        <div className="space-y-3">
                            {recentReferrals.map((ref, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                        👤
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-mono text-sm">{ref.address}</div>
                                        <div className="text-xs text-muted-foreground">{ref.date}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs px-2 py-1 rounded-full ${ref.status === "completed"
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-yellow-500/20 text-yellow-400"
                                            }`}>
                                            {ref.status}
                                        </div>
                                        <div className="text-sm font-semibold text-green-400 mt-1">{ref.reward}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">Connect wallet to see your referrals</p>
                        </div>
                    )}
                </div>
            </div>

            {/* How It Works */}
            <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-heading font-bold mb-6 text-center">How It Works</h3>
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        { step: "1", icon: "🔗", title: "Share Your Link", desc: "Copy and share your unique referral link with friends" },
                        { step: "2", icon: "🎯", title: "Friends Join", desc: "When they sign up and trade using your link, you get credit" },
                        { step: "3", icon: "💰", title: "Earn Rewards", desc: "Earn a percentage of their trading fees as rewards" },
                    ].map((step) => (
                        <div key={step.step} className="text-center">
                            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-bold text-lg flex items-center justify-center mx-auto mb-4">
                                {step.step}
                            </div>
                            <div className="text-3xl mb-3">{step.icon}</div>
                            <h4 className="font-semibold mb-2">{step.title}</h4>
                            <p className="text-sm text-muted-foreground">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function TwitterIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function TelegramIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
    );
}
