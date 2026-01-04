"use client";

import { useState, useEffect, useCallback } from "react";

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    opacity: number;
    rotation: number;
    rotationSpeed: number;
    type: "confetti" | "spark" | "ring";
}

interface LaunchCelebrationProps {
    isVisible: boolean;
    tokenName: string;
    tokenTicker: string;
    tokenImage?: string;
    mint: string;
    onClose: () => void;
    onShare?: (platform: "twitter" | "telegram" | "copy") => void;
}

const COLORS = [
    "#22c55e", // green (primary)
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#f59e0b", // amber
    "#ec4899", // pink
    "#06b6d4", // cyan
];

export function LaunchCelebration({
    isVisible,
    tokenName,
    tokenTicker,
    tokenImage,
    mint,
    onClose,
    onShare,
}: LaunchCelebrationProps) {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [showContent, setShowContent] = useState(false);
    const [ringScale, setRingScale] = useState(0);
    const [copied, setCopied] = useState(false);

    // Generate particles on mount
    const generateParticles = useCallback(() => {
        const newParticles: Particle[] = [];

        // Confetti particles
        for (let i = 0; i < 80; i++) {
            const angle = (Math.PI * 2 * i) / 80;
            const speed = 3 + Math.random() * 5;
            newParticles.push({
                id: i,
                x: 50,
                y: 50,
                vx: Math.cos(angle) * speed * (0.5 + Math.random()),
                vy: Math.sin(angle) * speed * (0.5 + Math.random()) - 2,
                size: 4 + Math.random() * 8,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                opacity: 1,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 20,
                type: "confetti",
            });
        }

        // Spark particles
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            newParticles.push({
                id: 80 + i,
                x: 50,
                y: 50,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                color: "#22c55e",
                opacity: 1,
                rotation: 0,
                rotationSpeed: 0,
                type: "spark",
            });
        }

        return newParticles;
    }, []);

    // Animation loop
    useEffect(() => {
        if (!isVisible) {
            setParticles([]);
            setShowContent(false);
            setRingScale(0);
            return;
        }

        // Initial burst
        setParticles(generateParticles());

        // Animate ring
        const ringTimer = setTimeout(() => setRingScale(1), 100);

        // Show content after ring animation
        const contentTimer = setTimeout(() => setShowContent(true), 400);

        // Particle physics
        const interval = setInterval(() => {
            setParticles((prev) =>
                prev
                    .map((p) => ({
                        ...p,
                        x: p.x + p.vx * 0.3,
                        y: p.y + p.vy * 0.3,
                        vy: p.vy + 0.15, // gravity
                        vx: p.vx * 0.99, // drag
                        opacity: p.opacity - 0.008,
                        rotation: p.rotation + p.rotationSpeed,
                    }))
                    .filter((p) => p.opacity > 0)
            );
        }, 16);

        return () => {
            clearInterval(interval);
            clearTimeout(ringTimer);
            clearTimeout(contentTimer);
        };
    }, [isVisible, generateParticles]);

    const handleCopyLink = () => {
        const url = `${window.location.origin}/trade/${mint}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onShare?.("copy");
    };

    const handleShareTwitter = () => {
        const text = `I just launched $${tokenTicker} on @FuseFun! 🚀\n\nCheck it out:`;
        const url = `${window.location.origin}/trade/${mint}`;
        window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            "_blank"
        );
        onShare?.("twitter");
    };

    const handleShareTelegram = () => {
        const text = `I just launched $${tokenTicker} on Fuse.fun! 🚀`;
        const url = `${window.location.origin}/trade/${mint}`;
        window.open(
            `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
            "_blank"
        );
        onShare?.("telegram");
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map((p) => (
                    <div
                        key={p.id}
                        className="absolute"
                        style={{
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            opacity: p.opacity,
                            transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
                        }}
                    >
                        {p.type === "confetti" ? (
                            <div
                                style={{
                                    width: p.size,
                                    height: p.size * 0.6,
                                    backgroundColor: p.color,
                                    borderRadius: "1px",
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: p.size,
                                    height: p.size,
                                    backgroundColor: p.color,
                                    borderRadius: "50%",
                                    boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Expanding ring effect */}
            <div
                className="absolute w-[600px] h-[600px] rounded-full border-2 border-primary/50 pointer-events-none"
                style={{
                    transform: `scale(${ringScale})`,
                    opacity: 1 - ringScale * 0.7,
                    transition: "transform 0.6s ease-out, opacity 0.6s ease-out",
                }}
            />
            <div
                className="absolute w-[400px] h-[400px] rounded-full border border-primary/30 pointer-events-none"
                style={{
                    transform: `scale(${ringScale})`,
                    opacity: 1 - ringScale * 0.5,
                    transition: "transform 0.5s ease-out 0.1s, opacity 0.5s ease-out 0.1s",
                }}
            />

            {/* Main content */}
            <div
                className={`relative z-10 max-w-md w-full mx-4 transition-all duration-500 ${showContent ? "opacity-100 scale-100" : "opacity-0 scale-90"
                    }`}
            >
                <div className="bg-black/90 border border-primary/30 backdrop-blur-xl p-6 relative overflow-hidden">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

                    {/* Animated border */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>

                    {/* Success icon */}
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                <RocketIcon className="w-10 h-10 text-primary" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckIcon className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-primary mb-1">
                            Token Launched!
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Your token is now live on Solana
                        </p>
                    </div>

                    {/* Token info */}
                    <div className="bg-white/5 border border-white/10 p-4 mb-6">
                        <div className="flex items-center gap-4">
                            {tokenImage ? (
                                <img
                                    src={tokenImage}
                                    alt={tokenName}
                                    className="w-14 h-14 rounded-lg object-cover border border-white/20"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-2xl font-bold">
                                    {tokenTicker[0]}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg truncate">{tokenName}</h3>
                                <p className="text-primary font-mono">${tokenTicker}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-1">Status</div>
                                <div className="flex items-center gap-1.5 text-green-400 text-sm">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    Live
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Share buttons */}
                    <div className="space-y-3">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider text-center mb-2">
                            Share your token
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={handleShareTwitter}
                                className="flex flex-col items-center gap-2 p-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                                <TwitterIcon className="w-5 h-5" />
                                <span className="text-xs">Twitter</span>
                            </button>

                            <button
                                onClick={handleShareTelegram}
                                className="flex flex-col items-center gap-2 p-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                                <TelegramIcon className="w-5 h-5" />
                                <span className="text-xs">Telegram</span>
                            </button>

                            <button
                                onClick={handleCopyLink}
                                className="flex flex-col items-center gap-2 p-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                            >
                                {copied ? (
                                    <CheckIcon className="w-5 h-5 text-green-400" />
                                ) : (
                                    <LinkIcon className="w-5 h-5" />
                                )}
                                <span className="text-xs">{copied ? "Copied!" : "Copy Link"}</span>
                            </button>
                        </div>
                    </div>

                    {/* View token button */}
                    <button
                        onClick={onClose}
                        className="w-full mt-6 px-6 py-3 bg-primary text-black font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                        View Token
                        <ArrowRightIcon className="w-4 h-4" />
                    </button>

                    {/* Contract address */}
                    <div className="mt-4 text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            Contract Address
                        </div>
                        <div className="font-mono text-xs text-muted-foreground break-all">
                            {mint}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Icons
function XIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function RocketIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
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

function LinkIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
    );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
    );
}
