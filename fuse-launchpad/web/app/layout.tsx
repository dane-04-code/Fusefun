import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/providers/wallet-provider";
import { Navbar } from "@/components/navbar";
import { Ticker } from "@/components/ticker";
import { ReferralTracker } from "@/components/referral-tracker";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FUSE.FUN",
  description: "The fairest launchpad on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <SolanaWalletProvider>
          <Suspense fallback={null}>
            <ReferralTracker />
          </Suspense>
          <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Ticker />
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
