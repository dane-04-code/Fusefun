'use client';

import { Zap, TrendingUp, Rocket } from 'lucide-react';

export function Ticker() {
  const items = [
    { user: "8xH3u", action: "bought", amount: "0.5 SOL", token: "PEPE", icon: "🐸" },
    { user: "4kR9w", action: "sold", amount: "1.2 SOL", token: "DOGE", icon: "🐕" },
    { user: "7mN2p", action: "bought", amount: "5.0 SOL", token: "BONK", icon: "🦴" },
    { user: "2jL5x", action: "created", amount: "", token: "MOON", icon: "🌙" },
    { user: "9vB4k", action: "bought", amount: "2.5 SOL", token: "WIF", icon: "🎩" },
    { user: "3tQ8m", action: "bought", amount: "0.8 SOL", token: "CAT", icon: "🐱" },
  ];

  const tickerContent = [...items, ...items, ...items, ...items];

  return (
    <div className="w-full bg-gradient-to-r from-blue-950/50 via-black to-blue-950/50 border-b border-blue-500/20 overflow-hidden h-10 flex items-center relative">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-blue-500/5" />
      
      <div className="animate-ticker whitespace-nowrap flex gap-12 text-sm font-medium">
        {tickerContent.map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-muted-foreground">
            <span className="text-lg">{item.icon}</span>
            <span className="text-blue-400 font-mono">{item.user}</span>
            <span className={item.action === 'bought' ? 'text-green-400' : item.action === 'sold' ? 'text-red-400' : 'text-blue-400'}>
              {item.action}
            </span>
            {item.amount && <span className="text-white font-semibold">{item.amount}</span>}
            <span>of</span>
            <span className="text-white font-bold">${item.token}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
