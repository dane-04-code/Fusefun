"use client";

import { useState } from "react";
import Link from "next/link";

export function TopBanner() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="relative w-full bg-gradient-to-r from-primary/90 via-blue-600/90 to-primary/90 text-white py-2.5 px-4 overflow-hidden">
            {/* Animated Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent animate-pulse" />

            {/* Scrolling Stars/Particles Effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-white/40 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute top-1/3 left-1/2 w-0.5 h-0.5 bg-white/30 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                <div className="absolute top-2/3 left-3/4 w-1 h-1 bg-white/40 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
            </div>

            <div className="relative flex items-center justify-center gap-3 text-sm font-medium">
                {/* Sparkle Icon */}
                <span className="hidden sm:inline-flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-yellow-300 animate-pulse" />
                </span>

                {/* Banner Text */}
                <span className="text-white/90">
                    <span className="font-bold text-white">NEW:</span> Launch your token in 30 seconds with anti-rug protection
                </span>

                {/* CTA Link */}
                <Link
                    href="/create"
                    className="hidden sm:inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105"
                >
                    Try it now
                    <ArrowRightIcon className="w-3 h-3" />
                </Link>

                {/* Close Button */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close banner"
                >
                    <CloseIcon className="w-4 h-4 text-white/70 hover:text-white" />
                </button>
            </div>
        </div>
    );
}

// Icons
function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
    );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
    );
}

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}
