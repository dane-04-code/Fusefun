"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useReferral } from "@/components/providers/ReferralProvider";
import { FuseSDK } from "@/sdk/fuse-sdk";
import * as anchor from "@coral-xyz/anchor";

interface ReferralStats {
    totalEarnings: number;
    pendingRewards: number;
    referralCount: number;
}

export default function RewardsPage() {
    const { connected, publicKey } = useWallet();
    const { connection } = useConnection();
    const { getReferralLink, isRegistered, registerAndLinkReferrer, isLoading: registrationLoading } = useReferral();

    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [loading, setLoading] = useState(false);

    const referralLink = getReferralLink();

    // Fetch referral stats from on-chain when wallet is connected
    useEffect(() => {
        async function fetchStats() {
            if (!connected || !publicKey) {
                setStats(null);
                return;
            }

            setLoading(true);
            try {
                const dummyWallet = {
                    publicKey: publicKey,
                    signTransaction: async () => { throw new Error("Read only") },
                    signAllTransactions: async () => { throw new Error("Read only") }
                } as unknown as anchor.Wallet;

                const sdk = new FuseSDK(connection, dummyWallet);
                const userProfile = await sdk.getUserProfile(publicKey);

                if (userProfile) {
                    setStats({
                        totalEarnings: Number(userProfile.totalReferralFees) / 1e9, // Convert lamports to SOL
                        pendingRewards: 0, // Referral fees are paid instantly on-chain
                        referralCount: userProfile.referralCount,
                    });
                } else {
                    setStats({
                        totalEarnings: 0,
                        pendingRewards: 0,
                        referralCount: 0,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch referral stats:", error);
                setStats({
                    totalEarnings: 0,
                    pendingRewards: 0,
                    referralCount: 0,
                });
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [connected, publicKey, connection]);

    const copyToClipboard = () => {
        if (connected) {
            navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleRegister = async () => {
        const success = await registerAndLinkReferrer();
        if (success) {
            alert("Successfully registered! You can now earn referral rewards.");
        }
    };

    // Format SOL
    const formatSOL = (value: number) => {
        return `${value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} SOL`;
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">Referral Rewards</h1>
                <p className="text-sm text-muted-foreground">
                    Share your referral link and earn 10% of trading fees from everyone you refer.
                </p>
            </div>

            {/* Registration CTA - Show if not registered */}
            {connected && !isRegistered && (
                <div className="bg-primary/10 border border-primary/30 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium mb-1">Register to Start Earning</div>
                            <div className="text-xs text-muted-foreground">
                                Create your on-chain profile to track referral earnings
                            </div>
                        </div>
                        <button
                            onClick={handleRegister}
                            disabled={registrationLoading}
                            className="px-6 py-2 bg-primary text-black text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
                        >
                            {registrationLoading ? "Registering..." : "Register Now"}
                        </button>
                    </div>
                </div>
            )}

            {/* Referral Link Section */}
            <div className="bg-black/40 border border-white/10 p-6 mb-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Your Referral Link</div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="flex-1 px-4 py-3 bg-black/60 border border-white/10 text-sm font-mono text-foreground focus:outline-none"
                    />
                    <button
                        onClick={copyToClipboard}
                        disabled={!connected}
                        className="px-6 py-3 bg-primary text-black text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>

                {/* Share Buttons */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                    <span className="text-xs text-muted-foreground">Share:</span>
                    <a
                        href={connected ? `https://twitter.com/intent/tweet?text=Trade%20on%20Fuse%20and%20get%20the%20fairest%20launches%20on%20Solana!&url=${encodeURIComponent(referralLink)}` : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <TwitterIcon className="w-4 h-4 text-white/60" />
                    </a>
                    <a
                        href={connected ? `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Trade%20on%20Fuse%20-%20the%20fairest%20launchpad%20on%20Solana!` : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <TelegramIcon className="w-4 h-4 text-white/60" />
                    </a>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-black/40 border border-white/10 p-5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total Earnings</div>
                    {loading ? (
                        <div className="text-2xl font-bold text-white/30">--</div>
                    ) : (
                        <div className="text-2xl font-bold text-green-400">
                            {connected && stats ? formatSOL(stats.totalEarnings) : "0.0000 SOL"}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Paid directly to your wallet</p>
                </div>
                <div className="bg-black/40 border border-white/10 p-5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Referrals</div>
                    {loading ? (
                        <div className="text-2xl font-bold text-white/30">--</div>
                    ) : (
                        <div className="text-2xl font-bold text-blue-400">
                            {connected && stats ? stats.referralCount : 0}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">People using your link</p>
                </div>
                <div className="bg-black/40 border border-white/10 p-5">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Reward Rate</div>
                    <div className="text-2xl font-bold text-primary">10%</div>
                    <p className="text-xs text-muted-foreground mt-1">Of trading fees</p>
                </div>
            </div>

            {/* How It Works */}
            <div className="bg-black/40 border border-white/10 p-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-6">How It Works</div>
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        { step: "01", title: "Share Your Link", desc: "Copy and share your unique referral link with friends" },
                        { step: "02", title: "They Trade", desc: "When they trade using your link, you're linked as their referrer" },
                        { step: "03", title: "Earn Instantly", desc: "Get 10% of protocol fees paid directly to your wallet" },
                    ].map((item) => (
                        <div key={item.step} className="border-l border-white/10 pl-4">
                            <div className="text-xs text-primary font-mono mb-2">{item.step}</div>
                            <h4 className="text-sm font-medium mb-1">{item.title}</h4>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
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
