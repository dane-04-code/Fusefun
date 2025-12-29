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
    <div className="max-w-5xl mx-auto pt-8">
      {/* Header */}
      <div className="text-center mb-10 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
            <span className="text-xl">🚀</span>
            <span className="text-sm text-primary font-bold uppercase tracking-wide">Launch Your Token</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-black mb-4 tracking-tight">
            Create a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Legendary</span> Token
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Launch your coin in seconds with <span className="text-foreground font-semibold">fair mechanics</span> and <span className="text-foreground font-semibold">anti-rug protection</span>.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-6 mb-12 relative z-10">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all border ${step >= s.id
                ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                : "bg-black/40 border-white/10 text-muted-foreground"
                }`}
            >
              {step > s.id ? "✓" : s.id}
            </div>
            <div className={`ml-3 text-sm hidden sm:block font-medium ${step >= s.id ? "text-foreground" : "text-muted-foreground"
              }`}>
              {s.title}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 h-0.5 ml-6 bg-gradient-to-r ${step > s.id ? "from-primary to-primary" : "from-white/10 to-white/5"
                }`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 relative z-10">
        {/* Form */}
        <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-sm">1</span>
                Token Information
              </h2>

              <div>
                <label className="block text-sm font-bold mb-2 text-muted-foreground/80">TOKEN NAME</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="e.g., Moon Cat"
                  className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-foreground placeholder:text-muted-foreground/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-muted-foreground/80">TICKER</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                  <input
                    type="text"
                    value={form.ticker}
                    onChange={(e) => updateForm("ticker", e.target.value.toUpperCase())}
                    placeholder="MCAT"
                    maxLength={10}
                    className="w-full pl-9 pr-5 py-3.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-primary font-bold uppercase placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-muted-foreground/80">DESCRIPTION</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Tell the world about your token..."
                  rows={4}
                  className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-muted-foreground/80">TOKEN IMAGE</label>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-primary/50 hover:bg-white/5 transition-all cursor-pointer group">
                  <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-3xl">📁</span>
                  </div>
                  <p className="text-sm font-medium">
                    Drop image here or <span className="text-primary hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">PNG, JPG, GIF up to 5MB</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-heading font-bold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-sm">2</span>
                Social Links <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-muted-foreground font-normal ml-2">OPTIONAL</span>
              </h2>

              <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-muted-foreground/80">
                  <TwitterIcon className="w-4 h-4 text-[#1DA1F2]" /> Twitter
                </label>
                <input
                  type="text"
                  value={form.twitter}
                  onChange={(e) => updateForm("twitter", e.target.value)}
                  placeholder="https://twitter.com/yourtoken"
                  className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-muted-foreground/80">
                  <TelegramIcon className="w-4 h-4 text-[#0088cc]" /> Telegram
                </label>
                <input
                  type="text"
                  value={form.telegram}
                  onChange={(e) => updateForm("telegram", e.target.value)}
                  placeholder="https://t.me/yourtoken"
                  className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2 text-muted-foreground/80">
                  <GlobeIcon className="w-4 h-4 text-emerald-400" /> Website
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => updateForm("website", e.target.value)}
                  placeholder="https://yourtoken.com"
                  className="w-full px-5 py-3.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-sm">3</span>
                Review & Launch
              </h2>

              <div className="space-y-2 bg-black/20 rounded-xl p-6 border border-white/5">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-muted-foreground text-sm">Token Name</span>
                  <span className="font-bold text-foreground">{form.name || "Not set"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-muted-foreground text-sm">Ticker</span>
                  <span className="font-bold text-blue-400">${form.ticker || "NOT SET"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-muted-foreground text-sm">Network</span>
                  <span className="font-bold text-purple-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" /> Solana</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-muted-foreground text-sm">Launch Cost</span>
                  <span className="font-bold text-green-400">~0.02 SOL</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-900/10 border border-green-500/20 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🛡️</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-green-400">Anti-Rug Protection</h4>
                    <p className="text-sm text-green-200/60 leading-relaxed mt-1">
                      Liquidity is automatically locked. Team tokens are vested. You cannot rug your holders on Fusey.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5 hover:text-white text-muted-foreground transition-all disabled:opacity-0"
            >
              Back
            </button>

            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={step === 1 && (!form.name || !form.ticker)}
                className="px-8 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={isLoading}
                className="px-8 py-3 w-full sm:w-auto bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {isLoading ? "Launching..." : connected ? "🚀 Launch Token (0.02 SOL)" : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <h3 className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-widest pl-1">Live Preview</h3>

          <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden hover:border-primary/50 transition-all duration-300 group shadow-2xl shadow-black/50">
            {/* Preview Card Header */}
            <div className="h-32 bg-gradient-to-br from-white/5 to-black relative">
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20 text-4xl font-black uppercase">
                {form.ticker || "TICKER"}
              </div>
            </div>

            <div className="p-6 relative">
              {/* Avatar */}
              <div className="absolute -top-8 left-6 w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-blue-500 border-4 border-black flex items-center justify-center text-3xl shadow-lg">
                {form.image ? "🖼️" : "🪙"}
              </div>

              <div className="mt-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold font-heading">{form.name || "Token Name"}</h2>
                    <p className="text-blue-400 font-bold">${form.ticker || "TICKER"}</p>
                  </div>
                  <div className="bg-green-500/10 text-green-400 px-3 py-1 rounded-lg text-xs font-bold border border-green-500/20">
                    MARKET CAP: $0
                  </div>
                </div>

                {form.description && (
                  <p className="text-sm text-muted-foreground mt-4 leading-relaxed line-clamp-3">
                    {form.description}
                  </p>
                )}

                {/* Progress */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Bonding Curve Progress</span>
                    <span className="text-primary">0%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-blue-500 w-[0%]" />
                  </div>
                </div>

                {/* Socials Preview */}
                <div className="mt-6 flex gap-2">
                  {[
                    { active: form.twitter, icon: TwitterIcon, color: "text-blue-400" },
                    { active: form.telegram, icon: TelegramIcon, color: "text-sky-500" },
                    { active: form.website, icon: GlobeIcon, color: "text-emerald-400" }
                  ].map((social, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${social.active ? `bg-white/5 border-white/10 ${social.color}` : "bg-transparent border-transparent text-muted-foreground/20"}`}>
                      <social.icon className="w-4 h-4" />
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs mt-0.5">ℹ️</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Preview updates automatically as you type. This is how your token card will appear on the launchpad.
              </p>
            </div>
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
