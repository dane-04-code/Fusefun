"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const navItems = [
    { href: "/", label: "Home" },
    { href: "/king-of-the-hill", label: "Ranking" },
    { href: "/rewards", label: "Rewards" },
    { href: "/how-it-works", label: "How it works" },
];

export function TopBar() {
    const [searchQuery, setSearchQuery] = useState("");
    const { connected, publicKey, disconnect } = useWallet();
    const { setVisible } = useWalletModal();
    const pathname = usePathname();

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
        <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center justify-between h-16 px-4 lg:px-6">
                {/* Logo & Nav */}
                <div className="flex items-center gap-8">
                    {/* Mobile Logo (visible only on mobile if Sidebar is hidden/custom logic needed, but keeping generally consistent) */}
                    <Link href="/" className="lg:hidden flex items-center gap-2 group">
                        <div className="relative h-8 w-8 bg-gradient-to-br from-primary to-blue-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-md font-bold font-heading">F</span>
                        </div>
                        <span className="text-lg font-heading font-bold text-white">
                            FUSEY
                        </span>
                    </Link>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3 ml-auto">
                    {/* Search Bar */}
                    <div className="hidden md:block relative w-64 lg:w-96">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search tokens..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/5 rounded-lg focus:border-primary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    {/* Launch Token Button */}
                    <Link
                        href="/create"
                        className="hidden sm:flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                    >
                        <RocketIcon className="w-4 h-4" />
                        LAUNCH
                    </Link>

                    {/* Wallet Button */}
                    <button
                        onClick={handleWalletClick}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all border ${connected
                            ? "bg-secondary border-white/10 text-white hover:bg-secondary/80"
                            : "bg-blue-600 hover:bg-blue-500 text-white border-transparent shadow-lg shadow-blue-600/20"
                            }`}
                    >
                        <WalletIcon className="w-4 h-4" />
                        {connected && publicKey
                            ? formatAddress(publicKey.toBase58())
                            : "Connect Wallet"}
                    </button>
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

function WalletIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
        </svg>
    );
}
