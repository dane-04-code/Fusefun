import type { Metadata } from "next";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/providers/wallet-provider";
import { ReferralProvider } from "@/components/providers/ReferralProvider";
import { ToastProvider } from "@/components/ui/error-toast";
import { TopBar } from "@/components/layout/TopBar";
import { TopBanner } from "@/components/layout/TopBanner";
import { LiveTicker } from "@/components/layout/LiveTicker";
import { Footer } from "@/components/layout/Footer";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Fusey - The Fairest Launchpad on Solana",
  description: "The fairest token launchpad on Solana. Launch tokens in seconds with anti-rug protection.",
  keywords: ["Solana", "Launchpad", "Token", "Crypto", "DeFi", "Meme Coins"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <SolanaWalletProvider>
          <Suspense fallback={null}>
            <ReferralProvider>
              <ToastProvider>
              <div className="min-h-screen animated-bg flex flex-col">
                {/* Sci-Fi Tech Grid Background */}
                <div className="tech-grid-bg" aria-hidden="true" />
                {/* Animated Scanline Effect */}
                <div className="scanline-effect" aria-hidden="true" />

                {/* Main Content Area - Full Width */}
                <div className="w-full relative z-10 flex-1 flex flex-col">
                  {/* Top Announcement Banner */}
                  <TopBanner />

                  {/* Live Ticker - Token launches & milestones */}
                  <LiveTicker />

                  {/* Top Bar */}
                  <TopBar />

                  {/* Page Content */}
                  <main className="p-4 lg:p-6 max-w-[1600px] mx-auto flex-1 w-full">
                    {children}
                  </main>

                  {/* Footer */}
                  <Footer />
                </div>
              </div>
              </ToastProvider>
            </ReferralProvider>
          </Suspense>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}


