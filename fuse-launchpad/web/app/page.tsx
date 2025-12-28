"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [tokens, setTokens] = useState<any[]>([]);
  const [kingData, setKingData] = useState({
    name: "BONK",
    ticker: "$BONK",
    emoji: "🐕",
    volume: "$4.2M",
    marketCap: "$12.5M",
    holders: "45,892",
    gain: "+1,247%",
    age: "2d ago",
  });

  // Create mock tokens
  const mockTokens = [
    { id: 1, name: "PepeSol", ticker: "$PSOL", emoji: "🐸", mcap: "$45.2k", creator: "User4921", desc: "The most retro token on Solana" },
    { id: 2, name: "MoonCat", ticker: "$MCAT", emoji: "🐱", mcap: "$78.5k", creator: "User8123", desc: "Climb to the moon" },
    { id: 3, name: "FireDog", ticker: "$FDOG", emoji: "🐕", mcap: "$12.3k", creator: "User5641", desc: "Hot and spicy meme token" },
    { id: 4, name: "CyberApe", ticker: "$CAPE", emoji: "🦍", mcap: "$34.1k", creator: "User2891", desc: "Digital revolution" },
    { id: 5, name: "GhostToken", ticker: "$GHOST", emoji: "👻", mcap: "$8.9k", creator: "User7412", desc: "Boo! Scare the market" },
    { id: 6, name: "RocketShip", ticker: "$ROCKET", emoji: "🚀", mcap: "$56.7k", creator: "User1234", desc: "To infinity and beyond" },
    { id: 7, name: "DiamondHand", ticker: "$DIAMOND", emoji: "💎", mcap: "$92.4k", creator: "User5678", desc: "HODL forever" },
    { id: 8, name: "ThunderStrike", ticker: "$THUNDER", emoji: "⚡", mcap: "$23.5k", creator: "User9012", desc: "Lightning fast gains" },
  ];

  useEffect(() => {
    setTokens(mockTokens);

    // Create particles
    const particlesContainer = document.getElementById("particles");
    if (particlesContainer) {
      const colors = [
        "rgba(59, 130, 246, 0.5)",
        "rgba(139, 92, 246, 0.5)",
        "rgba(236, 72, 153, 0.3)",
      ];

      for (let i = 0; i < 50; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = Math.random() * 100 + "%";
        particle.style.top = Math.random() * 100 + "%";
        particle.style.animationDelay = Math.random() * 20 + "s";
        particle.style.animationDuration = Math.random() * 20 + 15 + "s";
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.width = Math.random() * 4 + 2 + "px";
        particle.style.height = particle.style.width;
        particle.style.borderRadius = "50%";
        particle.style.position = "fixed";
        particle.style.pointerEvents = "none";
        particle.style.zIndex = "0";
        particlesContainer.appendChild(particle);
      }
    }

    // Generate chart bars
    const chartContainer = document.getElementById("kingChart");
    if (chartContainer) {
      for (let i = 0; i < 24; i++) {
        const bar = document.createElement("div");
        const height = 20 + Math.random() * 70;
        bar.style.flex = "1";
        bar.style.height = height + "%";
        bar.style.minWidth = "6px";
        bar.style.borderRadius = "2px";
        bar.style.background = Math.random() > 0.3 ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)";
        bar.style.transition = "all 0.3s";
        chartContainer.appendChild(bar);
      }
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
  };

  const connectWallet = () => {
    setWalletAddress("8x...3d21");
    setIsAccountDropdownOpen(false);
  };

  return (
    <div
      className={`min-h-screen text-white transition-all ${
        isDarkMode
          ? "bg-gradient-to-br from-black via-[#0a0a1a] to-[#0f172a]"
          : "bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300"
      }`}
      style={{
        backgroundSize: "400% 400%",
        animation: isDarkMode ? "gradientShift 15s ease infinite" : "none",
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .font-pixel {
          font-family: 'Press Start 2P', cursive;
        }

        .gradient-text {
          background: linear-gradient(135deg, #60a5fa, #3b82f6, #8b5cf6, #a855f7);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: textGradient 3s ease infinite;
        }

        @keyframes textGradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% {
            transform: translateY(-100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .particle {
          animation: particleFloat 20s infinite;
        }

        body.light-theme {
          background: linear-gradient(-45deg, #f8fafc, #e2e8f0, #f1f5f9, #e2e8f0) !important;
          color: #1e293b;
        }

        body.light-theme .text-white { color: #1e293b; }
        body.light-theme .text-gray-400 { color: #64748b; }
        body.light-theme .bg-gray-800 { background: #f1f5f9; }
      `}</style>

      <div id="particles" className="fixed inset-0 pointer-events-none z-0"></div>

      {/* Live Ticker */}
      <div className="ticker-wrap py-2 border-b border-blue-500/20 bg-black/30 relative z-10">
        <div className="flex gap-8 px-4 whitespace-nowrap animate-scroll overflow-hidden">
          <span className="text-yellow-400">👑 {kingData.ticker} is King of the Hill! {kingData.volume} 24h volume</span>
          <span className="text-green-400">🚀 New token launching every minute</span>
          <span className="text-blue-400">💎 3 tokens graduating today</span>
          <span className="text-purple-400">⚡ Live on Solana Mainnet</span>
          <span className="text-pink-400">🔥 $2.5M total volume today</span>
          <span className="text-green-400">✨ Fair launch - No presale, No team tokens</span>
          <span className="text-cyan-400">🛡️ Anti-rug protection enabled</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-black/60 backdrop-blur-md border-b border-gray-700/30 relative z-10">
        <div className="w-full flex h-20 items-center px-6 lg:px-12">
          <div className="flex items-center justify-between w-full">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/40 hover:scale-105 transition-transform">
                <span className="text-white text-lg font-bold">F</span>
              </div>
              <span className="text-lg tracking-tight gradient-text hidden xl:block font-pixel">FUSE.FUN</span>
            </Link>

            {/* Nav Links */}
            <div className="hidden lg:flex items-center justify-center flex-1 gap-6 xl:gap-10 mx-8">
              <Link href="/create.html" className="text-gray-400 hover:text-blue-400 px-3 py-2 transition-all text-sm">
                Create
              </Link>
              <a href="#" className="text-gray-400 hover:text-blue-400 px-3 py-2 transition-all text-sm">
                Trade
              </a>
              <a href="#" className="text-gray-400 hover:text-yellow-400 px-3 py-2 transition-all text-sm">
                King of Hill
              </a>
              <a href="#" className="text-gray-400 hover:text-purple-400 px-3 py-2 transition-all text-sm">
                How it Works
              </a>
              <Link href="/rewards.html" className="text-gray-400 hover:text-green-400 px-3 py-2 transition-all text-sm">
                Rewards
              </Link>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-blue-500/50 hover:bg-gray-700/50 transition-all"
                title="Toggle Theme"
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-blue-500/50 hover:bg-gray-700/50 transition-all"
                  title="Account"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>

                {isAccountDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-black/80 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl border border-gray-700/50 z-50">
                    <div className="p-4 border-b border-gray-700/50">
                      <div className="text-[10px] text-gray-400 mb-1">Account</div>
                      <div className="text-[10px] text-white truncate">{walletAddress || "Not connected"}</div>
                    </div>
                    <div className="p-2">
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all text-left">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-[10px] text-gray-300">View Profile</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all text-left">
                        <svg className="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        <span className="text-[10px] text-gray-300">Connect X</span>
                        <span className="ml-auto text-[8px] text-gray-500">+500 pts</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet Connect */}
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white px-4 py-2.5 rounded-lg text-xs transition-all flex items-center gap-2 font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>{walletAddress || "Connect Wallet"}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-3xl md:text-5xl leading-relaxed mb-8 text-white drop-shadow-lg">
            THE <span className="gradient-text">FAIREST</span>
            <br />
            LAUNCHPAD
            <br />
            <span className="text-xl md:text-3xl">on Solana</span>
          </h1>
          <p className="text-sm text-gray-400 mb-12 max-w-2xl mx-auto">
            The Fairest launchpad on Solana. <span className="text-blue-400">Built for Traders.</span>
          </p>
          <div className="flex gap-4 justify-center mb-20">
            <Link
              href="/create.html"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl text-xs hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/30 hover:scale-105"
            >
              Launch Token
            </Link>
            <button className="border-2 border-gray-700 text-gray-300 px-8 py-4 rounded-xl text-xs hover:border-blue-500/50 hover:text-white hover:bg-blue-500/10 transition-all">
              Watch Demo
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 hover:bg-black/50 transition-all border border-gray-700/30 hover:scale-105">
              <div className="text-2xl text-blue-400 mb-2">1,234</div>
              <div className="text-gray-400 text-[10px]">Tokens Launched</div>
              <div className="mt-2 text-xs text-green-400">↑ 12% this week</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 hover:bg-black/50 transition-all border border-gray-700/30 hover:scale-105">
              <div className="text-2xl text-green-400 mb-2">$2.5M</div>
              <div className="text-gray-400 text-[10px]">Total Volume</div>
              <div className="mt-2 text-xs text-green-400">↑ 24% this week</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 hover:bg-black/50 transition-all border border-gray-700/30 hover:scale-105">
              <div className="text-2xl text-purple-400 mb-2">45K</div>
              <div className="text-gray-400 text-[10px]">Community Members</div>
              <div className="mt-2 text-xs text-green-400">↑ 892 today</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 hover:bg-black/50 transition-all border border-gray-700/30 hover:scale-105">
              <div className="text-2xl text-yellow-400 mb-2">99.2%</div>
              <div className="text-gray-400 text-[10px]">Success Rate</div>
              <div className="mt-2 text-xs text-blue-400">⭐ Industry Leading</div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="py-20">
          <h2 className="text-xl text-center mb-4">
            Why <span className="gradient-text">FUSE.FUN</span>?
          </h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">Built different. Fair launches, real protection, maximum gains.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: "⚡", title: "Instant Launch", desc: "Launch your token in seconds with our streamlined process." },
              { icon: "🛡️", title: "Anti-Rug Protection", desc: "Built-in mechanisms prevent rug pulls. SAFU guaranteed." },
              { icon: "👑", title: "King of the Hill", desc: "The hottest token gets the crown and prime visibility." },
            ].map((feature, i) => (
              <div key={i} className="bg-black/40 backdrop-blur-md rounded-2xl p-8 hover:bg-black/50 transition-all border border-gray-700/30 hover:scale-105">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center mb-6 text-3xl">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* King of the Hill */}
        <section className="py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2 mb-6">
              <span className="text-xl">👑</span>
              <span className="text-sm text-yellow-300">Today's Champion</span>
            </div>
            <h2 className="text-2xl md:text-3xl mb-4">
              King of the <span className="text-yellow-400">Hill</span>
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">The token with the highest 24h volume claims the throne</p>
          </div>

          <div className="max-w-4xl mx-auto bg-black/40 backdrop-blur-md rounded-3xl overflow-hidden border-2 border-yellow-500/30 hover:border-yellow-400/50 transition-all">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-6xl z-10">👑</div>

            <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 pt-12 pb-6 px-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-5xl">
                  {kingData.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-bold text-white mb-2">{kingData.name}</h3>
                  <p className="text-blue-400 mb-4">{kingData.ticker}</p>
                  <div className="flex items-center gap-4">
                    <span className="text-green-400 text-sm">↑ {kingData.gain}</span>
                    <span className="text-gray-400 text-sm">Launched {kingData.age}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-900/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{kingData.volume}</div>
                <div className="text-[10px] text-gray-400">24h Volume</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">{kingData.marketCap}</div>
                <div className="text-[10px] text-gray-400">Market Cap</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">{kingData.holders}</div>
                <div className="text-[10px] text-gray-400">Holders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">128K</div>
                <div className="text-[10px] text-gray-400">Transactions</div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800/50">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400">Price Chart (24h)</span>
                    <span className="text-xs text-green-400">+24.5%</span>
                  </div>
                  <div className="h-24 bg-gray-800/30 rounded-xl flex items-end justify-around p-2 gap-1" id="kingChart"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Token Grid */}
        <section className="py-16">
          <h2 className="text-xl mb-8">Trending Tokens</h2>

          <div className="flex gap-2 bg-black/40 backdrop-blur-md rounded-xl p-1 mb-8 w-fit">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px]">New</button>
            <button className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-[10px] hover:bg-white/5">Trending</button>
            <button className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-[10px] hover:bg-white/5">Graduating</button>
            <button className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-[10px] hover:bg-white/5">King</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {tokens.map((token) => (
              <Link href={`/token.html?mint=${token.id}`} key={token.id} className="block">
                <div className="bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden hover:bg-black/50 transition-all border border-gray-700/30 hover:scale-105 p-4 cursor-pointer">
                  <div className="text-4xl mb-3">{token.emoji}</div>
                  <h3 className="text-[10px] text-white font-bold mb-1">{token.name}</h3>
                  <p className="text-blue-400 text-[10px] mb-2">{token.ticker}</p>
                  <p className="text-gray-400 text-[8px] line-clamp-2 mb-3">{token.desc}</p>
                  <div className="flex justify-between">
                    <div>
                      <div className="text-gray-500 text-[8px]">MCAP</div>
                      <div className="text-green-400 text-[10px]">{token.mcap}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 text-[8px]">CREATOR</div>
                      <div className="text-yellow-400 text-[8px]">{token.creator}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <button className="glass px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-all border border-gray-700 hover:border-blue-500/50">
              Load More Tokens ↓
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-black/40 backdrop-blur-md py-12 mt-20 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <div className="font-pixel text-2xl mb-6 gradient-text">FUSE.FUN</div>
          <div className="flex justify-center gap-8 mb-8 text-sm">
            <a href="#" className="text-gray-400 hover:text-white">
              TWITTER
            </a>
            <a href="#" className="text-gray-400 hover:text-white">
              TELEGRAM
            </a>
            <a href="#" className="text-gray-400 hover:text-white">
              DOCS
            </a>
          </div>
          <p className="text-[10px] text-gray-600">© 2024 FUSE.FUN // PRESS START TO CONTINUE</p>
        </div>
      </footer>
    </div>
  );
}

