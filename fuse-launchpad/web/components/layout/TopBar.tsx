"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const navItems = [
    { href: "/create", label: "CREATE", icon: RocketIcon, color: "text-yellow-400" },
    { href: "/trade", label: "TRADE", icon: ChartIcon, color: "text-pink-400" },
    { href: "/king-of-the-hill", label: "KING", icon: CrownIcon, color: "text-purple-400" },
    { href: "/rewards", label: "REWARDS", icon: GiftIcon, color: "text-green-400" },
    { href: "/profile", label: "PROFILE", icon: UserIcon, color: "text-blue-400" },
];

export function TopBar() {
    const [searchQuery, setSearchQuery] = useState("");
    const [solPrice, setSolPrice] = useState<number | null>(null);
    const [priceChange, setPriceChange] = useState<number | null>(null);
    const { connected, publicKey, disconnect } = useWallet();
    const { setVisible } = useWalletModal();
    const pathname = usePathname();

    // Fetch real SOL price from CoinGecko
    useEffect(() => {
        async function fetchSolPrice() {
            try {
                const response = await fetch(
                    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true"
                );
                if (response.ok) {
                    const data = await response.json();
                    setSolPrice(data.solana.usd);
                    setPriceChange(data.solana.usd_24h_change);
                }
            } catch (error) {
                console.error("Failed to fetch SOL price:", error);
            }
        }

        fetchSolPrice();
        // Refresh price every 60 seconds
        const interval = setInterval(fetchSolPrice, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleWalletClick = () => {
        if (connected) {
            disconnect();
        } else {
            setVisible(true);
        }
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    return (
        <header className="sticky top-0 z-30 bg-black/60 backdrop-blur-xl border-b border-white/10">
            {/* Main Navigation Bar - Full Width */}
            <div className="w-full border-b border-white/5">
                <div className="flex items-center justify-between h-12 px-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group shrink-0">
                        {/* Fuse Logo - uses mix-blend-mode to remove white background */}
                        <img
                            src="/logo.png"
                            alt="Fuse"
                            className="h-10 w-auto mix-blend-lighten drop-shadow-[0_0_8px_rgba(0,255,255,0.5)] hover:scale-105 transition-all duration-300"
                            onError={(e) => {
                                // Fallback to text logo if image not found
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        {/* Fallback text logo */}
                        <div className="hidden h-8 w-8 bg-gradient-to-br from-primary to-blue-500 rounded-lg items-center justify-center shadow-lg shadow-primary/20">
                            <span className="text-white text-md font-bold font-heading">F</span>
                        </div>
                    </Link>

                    {/* Full Width Navigation */}
                    <nav className="flex-1 flex items-center justify-center gap-1 mx-4">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isActive
                                        ? `${item.color} bg-white/10`
                                        : "text-white/60 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? item.color : ""}`} />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Wallet Button */}
                    <button
                        onClick={handleWalletClick}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all border ${connected
                            ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                            : "bg-gradient-to-r from-primary to-blue-500 text-white border-transparent shadow-lg shadow-primary/20 hover:shadow-primary/40"
                            }`}
                    >
                        <WalletIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">
                            {connected && publicKey
                                ? formatAddress(publicKey.toBase58())
                                : "Connect"}
                        </span>
                    </button>
                </div>
            </div>

            {/* Search Bar Row */}
            <div className="flex items-center justify-between h-12 px-4">
                <div className="flex items-center gap-4 flex-1">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-xl">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search tokens by name, symbol, or address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/5 rounded-lg focus:border-primary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="hidden lg:flex items-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">SOL:</span>
                        <span className="font-bold text-primary">
                            {solPrice !== null ? `$${solPrice.toFixed(2)}` : "..."}
                        </span>
                        {priceChange !== null && (
                            <span className={`text-[10px] ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Gas:</span>
                        <span className="font-bold text-green-400">Low</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-muted-foreground">Mainnet</span>
                    </div>
                </div>
            </div>
        </header>
    );
}

// Icons
function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}

function RocketIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
    );
}

function ChartIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    );
}

function CoinIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
    );
}

function CrownIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
    );
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
    );
}

function GiftIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
    );
}

function WalletIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
        </svg>
    );
}
