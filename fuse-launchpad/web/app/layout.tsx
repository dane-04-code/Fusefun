import type { Metadata } from "next";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/providers/wallet-provider";
import { TopBar } from "@/components/layout/TopBar";
import { TopBanner } from "@/components/layout/TopBanner";
import { LiveTicker } from "@/components/layout/LiveTicker";

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
          <div className="min-h-screen animated-bg">

            {/* Main Content Area - Full Width */}
            <div className="w-full">
              {/* Top Announcement Banner */}
              <TopBanner />

              {/* Live Ticker - Token launches & milestones */}
              <LiveTicker />

              {/* Top Bar */}
              <TopBar />

              {/* Page Content */}
              <main className="p-4 lg:p-6 max-w-[1600px] mx-auto">
                {children}
              </main>
            </div>
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
