"use client";

import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black/40 mt-auto">
            <div className="max-w-[1600px] mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Logo & Copyright */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            © 2026 Fuse. All rights reserved.
                        </span>
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-6 text-sm">
                        <Link
                            href="/terms"
                            className="text-muted-foreground hover:text-white transition-colors"
                        >
                            Terms of Service
                        </Link>
                        <Link
                            href="/privacy"
                            className="text-muted-foreground hover:text-white transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        <a
                            href="https://x.com/FuseyF16876"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-[#1DA1F2] transition-colors flex items-center gap-1"
                        >
                            <XIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Twitter</span>
                        </a>
                    </div>

                    {/* Disclaimer */}
                    <div className="text-xs text-muted-foreground/60 text-center md:text-right max-w-md">
                        Trading involves risk. Not financial advice.
                    </div>
                </div>
            </div>
        </footer>
    );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}
