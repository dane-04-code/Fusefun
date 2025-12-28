import type { Metadata } from "next";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/providers/wallet-provider";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "FUSE.FUN - The Fairest Launchpad on Solana",
  description: "The fairest launchpad on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js" async></script>
      </head>
      <body>
        <SolanaWalletProvider>
          <div className="min-h-screen animated-bg text-white">
              {children}
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
