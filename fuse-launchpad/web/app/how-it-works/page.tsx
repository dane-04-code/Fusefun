"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Coins, TrendingUp, ArrowRightLeft, ShieldCheck, Info } from "lucide-react";

export default function HowItWorksPage() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const sections = [
    { id: "intro", label: "Introduction", icon: Info },
    { id: "creation", label: "Coin Creation", icon: Rocket },
    { id: "trading", label: "How to Buy", icon: Coins },
    { id: "bonding-curve", label: "Bonding Curve", icon: TrendingUp },
    { id: "migration", label: "Migration", icon: ArrowRightLeft },
    { id: "fees", label: "Fees", icon: ShieldCheck },
  ];

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-2">
            <h2 className="text-xl font-bold mb-4 px-4">How it Works</h2>
            <nav className="flex flex-col space-y-1">
              {sections.map((section) => (
                <Button
                  key={section.id}
                  variant="ghost"
                  className="justify-start w-full text-left"
                  onClick={() => scrollToSection(section.id)}
                >
                  <section.icon className="mr-2 h-4 w-4" />
                  {section.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-12">
          
          {/* Introduction */}
          <section id="intro" className="scroll-mt-24">
            <h1 className="text-4xl font-bold mb-6">Welcome to FUSE.FUN</h1>
            <Card>
              <CardHeader>
                <CardTitle>The Fairest Launchpad on Solana</CardTitle>
                <CardDescription>
                  FUSE.FUN prevents rugs by making sure that all tokens are safe. Each coin on FUSE.FUN is a fair-launch with no presale and no team allocation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  We've simplified the process of launching and trading memecoins. No more sniping bots, no more rug pulls, just pure fun and fair trading.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Coin Creation */}
          <section id="creation" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Rocket className="mr-2 h-6 w-6" /> Coin Creation
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p>
                  Launching a coin on FUSE.FUN is simple and takes less than a minute.
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li>Click on "Start a new coin"</li>
                  <li>Upload an image and give your token a name and ticker</li>
                  <li>Add a description (optional)</li>
                  <li>Click "Create coin" and approve the transaction</li>
                </ol>
                <p className="text-muted-foreground text-sm mt-4">
                  Cost to deploy: ~0.02 SOL (Standard Solana network fees apply)
                </p>
              </CardContent>
            </Card>
          </section>

          {/* How to Buy */}
          <section id="trading" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <Coins className="mr-2 h-6 w-6" /> How to Buy & Sell
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p>
                  Trading on FUSE.FUN is designed to be intuitive.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Buying</h3>
                    <p className="text-sm">
                      Select a token, enter the amount of SOL you want to spend, and click Buy. You'll receive tokens instantly based on the current bonding curve price.
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Selling</h3>
                    <p className="text-sm">
                      Enter the amount of tokens you want to sell. The SOL value will be calculated automatically. Click Sell to swap back to SOL.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Bonding Curve */}
          <section id="bonding-curve" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <TrendingUp className="mr-2 h-6 w-6" /> Bonding Curve
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p>
                  We use a bonding curve to determine the price of tokens. This ensures continuous liquidity and fair pricing.
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>As people buy, the price goes up.</li>
                  <li>As people sell, the price goes down.</li>
                  <li>There is always enough liquidity to sell your tokens.</li>
                </ul>
                <div className="mt-4 p-4 border rounded-lg bg-background/50">
                  <p className="text-sm italic text-center">
                    "When the market cap reaches the target (approx. $69k), the bonding curve is completed."
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Migration */}
          <section id="migration" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <ArrowRightLeft className="mr-2 h-6 w-6" /> Migration to Raydium
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p>
                  Once the bonding curve is filled, the token graduates from FUSE.FUN.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="min-w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                    <p>Liquidity is deposited into Raydium.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="min-w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                    <p>Liquidity Provider (LP) tokens are burned, locking the liquidity forever.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="min-w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                    <p>Mint authority is revoked, ensuring no new tokens can ever be created.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Fees */}
          <section id="fees" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <ShieldCheck className="mr-2 h-6 w-6" /> Fees
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p>
                  FUSE.FUN charges a small fee on trades to maintain the platform and support development.
                </p>
                <div className="grid gap-4">
                  <div className="flex justify-between items-center p-3 border-b">
                    <span>Transaction Fee</span>
                    <span className="font-bold">1%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border-b">
                    <span>Migration Fee</span>
                    <span className="font-bold">~2 SOL</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    *Migration fee is taken from the raised funds to seed the Raydium liquidity pool.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

        </div>
      </div>
    </div>
  );
}
