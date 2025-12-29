"use client";

import { TokenRow } from "./TokenRow";

// Mock Data for the lists
const newlyCreated = [
    { name: "DumplingCoin", ticker: "$DPC", marketCap: "$2.74k", change: "3%", isPositive: true },
    { name: "Baby ENA", ticker: "$BABYENA", marketCap: "$2.88k", change: "4%", isPositive: true },
    { name: "TRUMP 2025", ticker: "$$", marketCap: "$2.78k", change: "4%", isPositive: true },
];

const graduating = [
    { name: "Be Like Bill", ticker: "$BILL", marketCap: "$3.67k", change: "5%", isPositive: true },
    { name: "Pirate PEPE", ticker: "$BOOTY", marketCap: "$3.37k", change: "4%", isPositive: true },
    { name: "SPAM", ticker: "$RDT", marketCap: "$3.17k", change: "4%", isPositive: true },
];

const listed = [
    { name: "RocketDoge", ticker: "$RDT", marketCap: "$21.6M", change: "listed", statusLabel: "listed", statusColor: "text-blue-400" },
    { name: "Hamster", ticker: "$HMC", marketCap: "$10.1M", change: "listed", statusLabel: "listed", statusColor: "text-blue-400" },
    { name: "Kitten Cat", ticker: "$KITTEN", marketCap: "$33.9k", change: "listed", statusLabel: "listed", statusColor: "text-blue-400" },
];

const diamonds = [
    { name: "Kitten Cat", ticker: "$KITTEN", marketCap: "$33.91k", change: "listed", statusLabel: "listed", statusColor: "text-orange-400" },
    { name: "SLAV", ticker: "$SLAV", marketCap: "$19.73k", change: "listed", statusLabel: "listed", statusColor: "text-orange-400" },
    { name: "BOB", ticker: "$BOB", marketCap: "$19.17k", change: "listed", statusLabel: "listed", statusColor: "text-orange-400" },
];


export function HeroSection() {
    return (
        <section className="mb-12 relative overflow-hidden">
            {/* Background elements if needed */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-primary/5 blur-[100px] pointer-events-none" />

            {/* Title */}
            <div className="text-center mb-10 relative z-10">
                <span className="text-sm font-mono text-primary mb-2 block tracking-widest uppercase">Market Today</span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 max-w-4xl mx-auto leading-tight">
                    The <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Fairest Launchpad</span> on Solana
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                    The first memecoin launchpad where you can <span className="text-yellow-400 font-bold">create</span>, <span className="text-green-400 font-bold">trade</span>, and <span className="text-blue-400 font-bold">stake</span> meme coins.
                </p>
            </div>

            {/* 4-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
                {/* 1. Newly Created */}
                <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <span className="text-xl">👀</span>
                        <h3 className="font-bold text-sm text-foreground/80">Newly Created</h3>
                    </div>
                    {newlyCreated.map((token, i) => (
                        <TokenRow key={i} {...token} price="0.00" />
                    ))}
                </div>

                {/* 2. Graduating */}
                <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <span className="text-xl">🎓</span>
                        <h3 className="font-bold text-sm text-foreground/80">Graduating</h3>
                    </div>
                    {graduating.map((token, i) => (
                        <TokenRow key={i} {...token} price="0.00" />
                    ))}
                </div>

                {/* 3. Listed on Raydium */}
                <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <span className="text-xl">🪐</span>
                        <h3 className="font-bold text-sm text-foreground/80">Listed on Raydium</h3>
                    </div>
                    {listed.map((token, i) => (
                        <TokenRow key={i} {...token} price="0.00" />
                    ))}
                </div>

                {/* 4. Diamonds */}
                <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <span className="text-xl">💎</span>
                        <h3 className="font-bold text-sm text-foreground/80">Diamonds</h3>
                    </div>
                    {diamonds.map((token, i) => (
                        <TokenRow key={i} {...token} price="0.00" />
                    ))}
                </div>
            </div>
        </section>
    );
}
