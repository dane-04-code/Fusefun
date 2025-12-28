"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

interface TokenForm {
  name: string;
  ticker: string;
  description: string;
  image: string;
  twitter: string;
  telegram: string;
  website: string;
}

export default function CreateTokenPage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<TokenForm>({
    name: "",
    ticker: "",
    description: "",
    image: "",
    twitter: "",
    telegram: "",
    website: "",
  });

  const updateForm = (field: keyof TokenForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleLaunch = async () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    setIsLoading(true);
    // Simulate launch
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    // Would redirect to token page
  };

  const steps = [
    { id: 1, title: "Token Info" },
    { id: 2, title: "Social Links" },
    { id: 3, title: "Review & Launch" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2 mb-4">
          <span className="text-xl">🚀</span>
          <span className="text-sm text-green-300 font-medium">Launch Your Token</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3">
          Create Your <span className="gradient-text">Token</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Launch your token in seconds with anti-rug protection. No coding required.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-10">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
                }`}
            >
              {step > s.id ? "✓" : s.id}
            </div>
            <span className={`ml-2 text-sm hidden sm:block ${step >= s.id ? "text-foreground" : "text-muted-foreground"
              }`}>
              {s.title}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 ml-4 ${step > s.id ? "bg-primary" : "bg-muted"
                }`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="glass-card rounded-2xl p-6">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-heading font-bold mb-4">Token Information</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Token Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="e.g., Moon Cat"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ticker Symbol *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input
                    type="text"
                    value={form.ticker}
                    onChange={(e) => updateForm("ticker", e.target.value.toUpperCase())}
                    placeholder="MCAT"
                    maxLength={10}
                    className="w-full pl-8 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Tell the world about your token..."
                  rows={4}
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Token Image</label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-sm text-muted-foreground">
                    Drop image here or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-heading font-bold mb-4">Social Links (Optional)</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Add social links to build trust with your community.
              </p>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <TwitterIcon className="w-4 h-4 text-[#1DA1F2]" /> Twitter
                </label>
                <input
                  type="text"
                  value={form.twitter}
                  onChange={(e) => updateForm("twitter", e.target.value)}
                  placeholder="https://twitter.com/yourtoken"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <TelegramIcon className="w-4 h-4 text-[#0088cc]" /> Telegram
                </label>
                <input
                  type="text"
                  value={form.telegram}
                  onChange={(e) => updateForm("telegram", e.target.value)}
                  placeholder="https://t.me/yourtoken"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <GlobeIcon className="w-4 h-4" /> Website
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => updateForm("website", e.target.value)}
                  placeholder="https://yourtoken.com"
                  className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-heading font-bold mb-4">Review & Launch</h2>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Token Name</span>
                  <span className="font-medium">{form.name || "Not set"}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Ticker</span>
                  <span className="font-medium">${form.ticker || "NOT SET"}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium text-purple-400">Solana</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Initial Supply</span>
                  <span className="font-medium">1,000,000,000</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-muted-foreground">Launch Fee</span>
                  <span className="font-medium text-green-400">0.02 SOL</span>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <h4 className="font-semibold text-green-400">Anti-Rug Protection</h4>
                    <p className="text-sm text-muted-foreground">
                      Your token will be launched with automatic anti-rug mechanisms.
                      Liquidity is locked and you cannot rug your holders.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="px-6 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>

            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={step === 1 && (!form.name || !form.ticker)}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={isLoading}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all disabled:opacity-50"
              >
                {isLoading ? "Launching..." : connected ? "🚀 Launch Token" : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Live Preview</h3>
          <div className="token-card">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-600/20 flex items-center justify-center text-2xl">
                🪙
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-foreground truncate">
                  {form.name || "Token Name"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  ${form.ticker || "TICKER"}
                </p>
              </div>
            </div>

            {form.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {form.description}
              </p>
            )}

            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Bonding Curve</span>
                <span className="font-medium text-foreground">0%</span>
              </div>
              <div className="progress-bar h-1.5">
                <div className="progress-bar-fill" style={{ width: "0%" }} />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground">MC: </span>
                <span className="text-green-400 font-semibold">$0</span>
              </div>
              <div>
                <span className="text-muted-foreground">By: </span>
                <span className="text-yellow-400">You</span>
              </div>
            </div>

            {(form.twitter || form.telegram || form.website) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                {form.twitter && (
                  <div className="p-1.5 rounded bg-[#1DA1F2]/20 text-[#1DA1F2]">
                    <TwitterIcon className="w-3 h-3" />
                  </div>
                )}
                {form.telegram && (
                  <div className="p-1.5 rounded bg-[#0088cc]/20 text-[#0088cc]">
                    <TelegramIcon className="w-3 h-3" />
                  </div>
                )}
                {form.website && (
                  <div className="p-1.5 rounded bg-white/10 text-foreground">
                    <GlobeIcon className="w-3 h-3" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="glass-card rounded-xl p-4 mt-4">
            <h4 className="font-semibold text-sm mb-2">Token Launch Details</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Fair launch with bonding curve</li>
              <li>• Anti-rug protection enabled</li>
              <li>• No team tokens or presale</li>
              <li>• Instant trading after launch</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}
