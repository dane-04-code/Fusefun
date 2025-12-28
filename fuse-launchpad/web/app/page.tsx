"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- Types ---
interface Token {
  id: number;
  name: string;
  ticker: string;
  desc: string;
  image: string;
  marketCap: number;
  replies: number;
  isKing?: boolean;
  creator: string;
}

// --- Mock Data Generators ---
const ADJECTIVES = ['Based', 'Super', 'Mega', 'Crypto', 'Moon', 'Space', 'Pixel', 'Retro', 'Doge', 'Pepe'];
const NOUNS = ['Cat', 'Dog', 'Frog', 'Ape', 'Coin', 'Token', 'Gem', 'Rocket', 'Inu', 'WifHat'];

function generateToken(id: number): Token {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return {
    id,
    name: `${adj} ${noun}`,
    ticker: `$${adj.substring(0, 3).toUpperCase()}${noun.substring(0, 3).toUpperCase()}`,
    desc: 'The most retro token on Solana. No rug, only pixel love.',
    image: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${id}`,
    marketCap: Math.floor(Math.random() * 50) + 5,
    replies: Math.floor(Math.random() * 100),
    creator: `User${Math.floor(Math.random() * 9999)}`
  };
}

export default function Home() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [king, setKing] = useState<Token | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    // Generate initial tokens
    const initialTokens = Array.from({ length: 12 }, (_, i) => generateToken(i));
    setKing(initialTokens[0]); // First one is King for now
    setTokens(initialTokens.slice(1));
  }, []);

  const connectWallet = async () => {
    // Mock connection
    setWalletAddress('8x...3d21');
  };

  return (
    <div className="min-h-screen bg-[#202020] text-white font-mono selection:bg-green-400 selection:text-black">
      {/* Inject Pixel Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        .font-pixel { 
          font-family: 'Press Start 2P', cursive; 
        }
        
        .pixel-shadow {
          box-shadow: 4px 4px 0px 0px #000000;
        }
        
        .pixel-shadow-sm {
          box-shadow: 2px 2px 0px 0px #000000;
        }

        .pixel-border {
          border: 4px solid #ffffff;
        }

        .pixel-card {
          background: #2d2d2d;
          border: 2px solid #ffffff;
          position: relative;
        }

        .pixel-btn {
          transition: all 0.1s;
        }
        .pixel-btn:active {
          transform: translate(2px, 2px);
          box-shadow: 0px 0px 0px 0px #000000;
        }

        .crt-overlay {
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
        }
      `}</style>

      {/* CRT Effect Overlay */}
      <div className="fixed inset-0 crt-overlay z-50 pointer-events-none"></div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#2d2d2d] border-b-4 border-white p-4">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 border-4 border-white flex items-center justify-center pixel-shadow">
              <span className="font-pixel text-2xl text-white">F</span>
            </div>
            <span className="font-pixel text-xl text-yellow-400 drop-shadow-md hidden md:block">FUSE.FUN</span>
          </div>

          <div className="flex items-center gap-6 font-pixel text-xs">
            <Link href="#" className="hover:text-yellow-400 transition-colors">[HOW IT WORKS]</Link>
            <Link href="#" className="hover:text-green-400 transition-colors">[REWARDS]</Link>
            <Link href="#" className="hover:text-blue-400 transition-colors">[TELEGRAM]</Link>
          </div>

          <button 
            onClick={connectWallet}
            className="font-pixel text-xs bg-blue-600 text-white px-6 py-3 border-2 border-white pixel-shadow pixel-btn hover:bg-blue-500"
          >
            {walletAddress ? walletAddress : 'CONNECT WALLET'}
          </button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="font-pixel text-3xl md:text-5xl leading-relaxed mb-8 text-white drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
            THE <span className="text-blue-400">FAIREST</span><br/>LAUNCHPAD
          </h1>
          <p className="font-pixel text-xs md:text-sm text-gray-400 mb-12 leading-loose max-w-2xl mx-auto">
            LAUNCH A COIN INSTANTLY. NO PRESALE. NO TEAM ALLOCATION. 100% FAIR.
          </p>
          <Link href="/create.html" className="inline-block font-pixel text-sm bg-green-500 text-black px-8 py-4 border-4 border-white pixel-shadow pixel-btn hover:bg-green-400 hover:scale-105 transition-transform">
            [ START A NEW COIN ]
          </Link>
        </div>

        {/* King of the Hill */}
        {king && (
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl animate-bounce">👑</span>
              <h2 className="font-pixel text-xl text-yellow-400">KING OF THE HILL</h2>
            </div>
            
            <div className="bg-[#1a1a1a] border-4 border-yellow-400 p-6 pixel-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-yellow-400 text-black font-pixel text-xs px-4 py-2">
                #1 RANKED
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="w-48 h-48 bg-gray-700 border-4 border-white shrink-0">
                  <img src={king.image} alt={king.name} className="w-full h-full object-cover rendering-pixelated" />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-pixel text-2xl mb-2 text-white">{king.name}</h3>
                  <p className="font-pixel text-sm text-blue-400 mb-4">{king.ticker}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
                    <div className="bg-gray-800 p-3 border-2 border-gray-600">
                      <div className="font-pixel text-[10px] text-gray-400 mb-1">MARKET CAP</div>
                      <div className="font-pixel text-sm text-green-400">${king.marketCap}k</div>
                    </div>
                    <div className="bg-gray-800 p-3 border-2 border-gray-600">
                      <div className="font-pixel text-[10px] text-gray-400 mb-1">REPLIES</div>
                      <div className="font-pixel text-sm text-white">{king.replies}</div>
                    </div>
                  </div>

                  <div className="font-pixel text-[10px] text-gray-400">
                    Created by <span className="text-yellow-400">{king.creator}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search / Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-[#2d2d2d] p-4 border-2 border-white pixel-shadow-sm">
          <input 
            type="text" 
            placeholder="SEARCH TOKENS..." 
            className="w-full md:w-96 bg-black border-2 border-gray-600 p-3 font-pixel text-xs text-white focus:border-blue-500 outline-none"
          />
          <div className="flex gap-4">
            <button className="font-pixel text-[10px] text-white hover:text-blue-400">[TERMINAL]</button>
            <button className="font-pixel text-[10px] text-white hover:text-blue-400">[FILTER]</button>
          </div>
        </div>

        {/* Token Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map((token) => (
            <div key={token.id} className="pixel-card p-4 hover:bg-[#363636] transition-colors cursor-pointer pixel-shadow-sm hover:-translate-y-1">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-700 border-2 border-white shrink-0">
                  <img src={token.image} alt={token.name} className="w-full h-full object-cover rendering-pixelated" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-pixel text-xs text-white truncate pr-2">{token.name}</h3>
                    <span className="font-pixel text-[10px] text-green-400">TOP</span>
                  </div>
                  <p className="font-pixel text-[10px] text-blue-400 mb-2">{token.ticker}</p>
                  <p className="font-mono text-xs text-gray-400 line-clamp-2 mb-3 leading-tight">
                    {token.desc}
                  </p>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="font-pixel text-[8px] text-gray-500">MCAP</div>
                      <div className="font-pixel text-[10px] text-green-400">${token.marketCap}k</div>
                    </div>
                    <div className="text-right">
                      <div className="font-pixel text-[8px] text-gray-500">CREATOR</div>
                      <div className="font-pixel text-[8px] text-yellow-400 truncate w-20">{token.creator}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t-4 border-white bg-[#2d2d2d] py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="font-pixel text-2xl mb-6 text-white">FUSE.FUN</div>
          <div className="flex justify-center gap-8 mb-8 font-pixel text-xs">
            <a href="#" className="text-gray-400 hover:text-white hover:underline">TWITTER</a>
            <a href="#" className="text-gray-400 hover:text-white hover:underline">TELEGRAM</a>
            <a href="#" className="text-gray-400 hover:text-white hover:underline">DOCS</a>
          </div>
          <p className="font-pixel text-[10px] text-gray-600">
            © 2024 FUSE.FUN // PRESS START TO CONTINUE
          </p>
        </div>
      </footer>
    </div>
  );
}

