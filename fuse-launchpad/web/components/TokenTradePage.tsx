'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Share2,
  Star,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Bell,
  Pencil,
  AlignJustify,
  ZoomIn,
} from 'lucide-react';
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { FuseSDK, TokenInfo, CurveState, PROGRAM_ID } from "@/sdk/fuse-sdk";
import * as anchor from "@coral-xyz/anchor";
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useSocketFeed } from '@/hooks/use-socket-feed';

// Types
interface TradeData {
  type: 'buy' | 'sell';
  solAmount: number;
  tokenAmount: number;
  user: string;
  timestamp: number;
  signature: string;
}

interface Holder {
  name: string;
  icon?: string;
  percent: number;
}

interface TokenTradePageProps {
  mintAddress?: string; // Make optional for now to avoid breaking existing usage
}

// Utility function
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(0);
};

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const formatAddress = (address: string): string => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};



const TokenTradePage: React.FC<TokenTradePageProps> = ({ mintAddress }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { lastTrade, isConnected } = useSocketFeed();

  // State
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  // Real Data State
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [curveState, setCurveState] = useState<CurveState | null>(null);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Mock Holders (Removed)
  // const mockHolders: Holder[] = ...

  // Chart Refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const currentBar = useRef<{ time: number; open: number; high: number; low: number; close: number } | null>(null);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#12121a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Handle Resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch Chart Data
  useEffect(() => {
    if (!mintAddress || !candleSeriesRef.current) return;

    const fetchChartData = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/tokens/${mintAddress}/chart`);
        if (res.ok) {
          const data = await res.json();
          // Ensure data is sorted by time
          const sortedData = data.sort((a: any, b: any) => a.time - b.time);
          candleSeriesRef.current?.setData(sortedData);
          if (sortedData.length > 0) {
            currentBar.current = sortedData[sortedData.length - 1];
          }
        }
      } catch (e) {
        console.error("Error fetching chart data:", e);
      }
    };

    fetchChartData();
  }, [mintAddress]);

  // Handle Real-time Updates
  useEffect(() => {
    if (!lastTrade || !candleSeriesRef.current || lastTrade.mint !== mintAddress) return;

    const price = lastTrade.price;
    const time = Math.floor(lastTrade.timestamp / 1000);
    // 1-minute candles
    const resolution = 60;
    const candleTime = Math.floor(time / resolution) * resolution;
    
    if (currentBar.current && currentBar.current.time === candleTime) {
      currentBar.current = {
        ...currentBar.current,
        high: Math.max(currentBar.current.high, price),
        low: Math.min(currentBar.current.low, price),
        close: price,
      };
    } else {
      currentBar.current = {
        time: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
      };
    }

    candleSeriesRef.current.update(currentBar.current as any);
  }, [lastTrade, mintAddress]);

  // Fetch Trades
  useEffect(() => {
    if (!mintAddress) return;

    const fetchTrades = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/tokens/${mintAddress}/trades?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setTrades(data);
        }
      } catch (e) {
        console.error("Error fetching trades:", e);
      }
    };

    fetchTrades();
  }, [mintAddress]);

  // Fetch Holders
  useEffect(() => {
    if (!mintAddress) return;

    const fetchHolders = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/tokens/${mintAddress}/holders`);
        if (res.ok) {
          const data = await res.json();
          
          // Derive curve PDA to identify it
          const [curvePda] = PublicKey.findProgramAddressSync(
            [Buffer.from('curve'), new PublicKey(mintAddress).toBuffer()],
            PROGRAM_ID
          );
          const curveAddress = curvePda.toString();

          const mappedHolders: Holder[] = data.map((h: any) => {
            const isCurve = h.address === curveAddress;
            return {
              name: isCurve ? 'Bonding Curve' : formatAddress(h.address),
              icon: isCurve ? '💧' : undefined,
              percent: h.percent
            };
          });
          
          setHolders(mappedHolders);
        }
      } catch (e) {
        console.error("Error fetching holders:", e);
      }
    };

    fetchHolders();
    const interval = setInterval(fetchHolders, 30000);
    return () => clearInterval(interval);
  }, [mintAddress]);

  // Listen for new trades via WebSocket
  useEffect(() => {
    if (!lastTrade || lastTrade.mint !== mintAddress) return;

    setTrades(prev => {
      // Check if trade is already in list (by signature)
      if (prev.some(t => t.signature === lastTrade.signature)) return prev;
      
      const newTrade: TradeData = {
        type: lastTrade.type as 'buy' | 'sell',
        solAmount: lastTrade.solAmount,
        tokenAmount: lastTrade.tokenAmount,
        user: lastTrade.user,
        timestamp: lastTrade.timestamp,
        signature: lastTrade.signature
      };
      
      return [newTrade, ...prev].slice(0, 50);
    });
  }, [lastTrade, mintAddress]);

  // Derived values or defaults
  const bondingProgress = tokenInfo?.bondingProgress || 0;
  const marketCap = tokenInfo?.marketCap || 0;
  const tokenPrice = tokenInfo?.price || 0;
  const tokenTicker = tokenInfo?.symbol || 'LOADING...';
  const TOKENS_PER_SOL = tokenPrice > 0 ? 1 / tokenPrice : 0;

  // Fetch Data
  useEffect(() => {
    if (!mintAddress) return;

    const fetchData = async () => {
      try {
        // Initialize SDK (wallet can be null for read-only)
        const sdk = new FuseSDK(connection, wallet as unknown as anchor.Wallet);
        const mint = new PublicKey(mintAddress);
        
        const info = await sdk.getTokenInfo(mint);
        const state = await sdk.getCurveState(mint);
        
        setTokenInfo(info);
        setCurveState(state);
      } catch (e) {
        console.error("Error fetching token data:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [mintAddress, connection, wallet, refreshTrigger]);

  // Calculate receive amount
  const calculateReceive = (): string => {
    const amount = parseFloat(inputAmount) || 0;
    if (activeTab === 'buy') {
      // Buying: Input is SOL, Output is Tokens
      // Estimate: amount * (1/price)
      // For better accuracy, we should use sdk.getQuoteBuy, but for UI display this is okay for now
      return formatNumber(amount * TOKENS_PER_SOL);
    } else {
      // Selling: Input is Tokens, Output is SOL
      return (amount * tokenPrice).toFixed(6);
    }
  };

  // Copy address handler
  const handleCopyAddress = async () => {
    if (mintAddress) {
      await navigator.clipboard.writeText(mintAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Set quick amount
  const handleSetAmount = (value: string | number) => {
    if (value === 'reset') {
      setInputAmount('');
    } else if (value === 'max') {
      // TODO: Fetch actual user balance
      setInputAmount(activeTab === 'buy' ? '1' : '1000');
    } else {
      setInputAmount(value.toString());
    }
  };

  // Place trade handler
  const handlePlaceTrade = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert("Please connect your wallet first");
      return;
    }
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      alert('Please enter an amount');
      return;
    }
    if (!mintAddress) {
      alert("Token not found");
      return;
    }

    try {
      setIsLoading(true);
      const sdk = new FuseSDK(connection, wallet as unknown as anchor.Wallet);
      const mint = new PublicKey(mintAddress);
      const amount = parseFloat(inputAmount);

      let tx;
      if (activeTab === 'buy') {
        const solAmount = FuseSDK.parseSolToLamports(amount);
        // 1% slippage for now
        const minTokensOut = 0n; 
        
        // NOTE: Referral code logic disabled until smart contract is redeployed
        // const referralCode = localStorage.getItem('fuse_referral_code') || undefined;
        
        tx = await sdk.buildBuyTx(wallet.publicKey, mint, solAmount, minTokensOut);
      } else {
        // For sell, we need to convert token amount to raw units (decimals=6)
        const tokenAmount = BigInt(Math.floor(amount * 1_000_000));
        const minSolOut = 0n;
        tx = await sdk.buildSellTx(wallet.publicKey, mint, tokenAmount, minSolOut);
      }

      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      
      alert(`Trade successful! Signature: ${signature}`);
      setRefreshTrigger(prev => prev + 1);
      setInputAmount('');
      
    } catch (e) {
      console.error("Trade failed:", e);
      alert("Trade failed. See console.");
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0d0d14]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm hidden sm:inline">Back</span>
            </button>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-sm font-bold">F</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">
                FUSE.FUN
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <Star className="w-5 h-5 text-yellow-400" fill="currentColor" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Token Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
              <span className="text-4xl">🦴</span>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold">Skeleton Banging Shield</h1>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">{tokenTicker}</span>
                <span className="px-2 py-0.5 rounded bg-white/5 text-gray-500 text-xs font-mono">
                  5vHf...pump
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">✓ ETAL73</span>
                <span>•</span>
                <span>7m ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#12121a] rounded-xl p-4 border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Market Cap</div>
                <div className="text-xl font-bold">${marketCap.toFixed(1)}K</div>
                <div className="text-xs text-green-400 mt-1">+$5.7K (+133.58%) 24hr</div>
              </div>
              <div className="bg-[#12121a] rounded-xl p-4 border border-white/5">
                <div className="text-xs text-gray-500 mb-1">ATH</div>
                <div className="text-xl font-bold">$18.4K</div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '54%' }} />
                  </div>
                  <span className="text-xs text-gray-500">54%</span>
                </div>
              </div>
              <div className="bg-[#12121a] rounded-xl p-4 border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Vol 24h</div>
                <div className="text-xl font-bold">$47.1K</div>
                <div className="text-xs text-gray-500 mt-1">874.85 SOL</div>
              </div>
              <div className="bg-[#12121a] rounded-xl p-4 border border-white/5">
                <div className="text-xs text-gray-500 mb-1">Price</div>
                <div className="text-xl font-bold">${tokenPrice.toFixed(8)}</div>
                <div className="text-xs text-red-400 mt-1">-18.65% (5m)</div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="bg-[#12121a] rounded-2xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {['1m', '5m', '15m', '1h'].map((tf, i) => (
                      <button
                        key={tf}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          i === 0
                            ? 'bg-white/5 text-white'
                            : 'text-gray-500 hover:bg-white/10'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <button className="text-xs text-gray-500 hover:text-white transition-colors">
                    Trade Display
                  </button>
                </div>
              </div>

              {/* Chart Container */}
              <div className="relative h-80 sm:h-96 p-4">
                <div ref={chartContainerRef} className="w-full h-full" />
                
                {/* Chart Tools */}
                <div className="absolute left-2 top-20 flex flex-col gap-2">
                  {[Pencil, AlignJustify, ZoomIn].map((Icon, i) => (
                    <button
                      key={i}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-white"
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Period Stats */}
              <div className="grid grid-cols-5 border-t border-white/5">
                {[
                  { label: 'Vol 24h', value: '$47.1K' },
                  { label: 'Price', value: '$0.00000997' },
                  { label: '5m', value: '-18.65%', color: 'text-red-400' },
                  { label: '1h', value: '+133.58%', color: 'text-green-400' },
                  { label: '6h', value: '+133.58%', color: 'text-green-400' },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className={`p-3 text-center ${i < 4 ? 'border-r border-white/5' : ''}`}
                  >
                    <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                    <div className={`text-sm font-semibold ${stat.color || ''}`}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Trades */}
            <div className="bg-[#12121a] rounded-2xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h3 className="font-semibold flex items-center gap-2">
                  Recent Trades
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </h3>
                <span className="text-xs text-gray-500">Live</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-white/5">
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Amount (SOL)</th>
                      <th className="text-left py-3 px-4 font-medium">Tokens</th>
                      <th className="text-left py-3 px-4 font-medium">Wallet</th>
                      <th className="text-right py-3 px-4 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade, i) => (
                      <tr key={trade.signature || i} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              trade.type === 'buy'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {trade.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{trade.solAmount.toFixed(4)} SOL</td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {formatNumber(trade.tokenAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <a href={`https://solscan.io/account/${trade.user}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-mono">
                            {formatAddress(trade.user)}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-500">{formatTimeAgo(trade.timestamp)}</td>
                      </tr>
                    ))}
                    {trades.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No trades yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column - Trading Terminal */}
          <div className="space-y-4">
            {/* Trading Card */}
            <div className="bg-[#12121a] rounded-2xl border border-white/5 overflow-hidden sticky top-20">
              {/* Tabs */}
              <div className="flex p-1 m-3 bg-white/5 rounded-xl">
                <button
                  onClick={() => setActiveTab('buy')}
                  className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'buy'
                      ? 'bg-green-500 text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setActiveTab('sell')}
                  className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'sell'
                      ? 'bg-red-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sell
                </button>
              </div>

              <div className="p-4 pt-0 space-y-4">
                {/* Switch Toggle */}
                <div className="flex items-center justify-between">
                  <button className="text-xs text-gray-400 hover:text-white transition-colors">
                    Switch to {tokenTicker}
                  </button>
                  <button className="text-xs text-gray-400 hover:text-white transition-colors">
                    Set max slippage
                  </button>
                </div>

                {/* Input */}
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="number"
                      value={inputAmount}
                      onChange={(e) => setInputAmount(e.target.value)}
                      placeholder="0.00"
                      className={`w-full bg-[#0a0a0f] border rounded-xl px-4 py-4 text-xl font-semibold text-white placeholder-gray-600 focus:outline-none transition-all ${
                        activeTab === 'buy'
                          ? 'border-white/10 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
                          : 'border-white/10 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      }`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-gray-400">
                        {activeTab === 'buy' ? 'SOL' : tokenTicker}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <span className="text-xs">◎</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Amounts */}
                  <div className="flex gap-2">
                    {['reset', 0.1, 0.5, 1, 'max'].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleSetAmount(val)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-400 hover:bg-white/10 transition-colors"
                      >
                        {val === 'reset' ? 'Reset' : val === 'max' ? 'Max' : `${val} SOL`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* You Receive */}
                <div className="bg-[#0a0a0f] rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-gray-500 mb-1">You receive</div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">{calculateReceive()}</span>
                    <span className="text-gray-400">
                      {activeTab === 'buy' ? tokenTicker : 'SOL'}
                    </span>
                  </div>
                </div>

                {/* Trade Button */}
                <button
                  onClick={handlePlaceTrade}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                    activeTab === 'buy'
                      ? 'bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/30'
                      : 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30'
                  }`}
                >
                  Log in to {activeTab}
                </button>

                {/* Transaction Cost */}
                <div className="text-xs text-gray-500 text-center">
                  Transaction cost: ~0.02 SOL
                </div>
              </div>

              {/* Position Info */}
              <div className="border-t border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm">$0.00</span>
                  <span className="text-gray-500 text-sm">0 {tokenTicker}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <button className="text-gray-400 hover:text-white transition-colors">
                    Position
                  </button>
                  <button className="text-green-400">Trades</button>
                </div>
              </div>
            </div>

            {/* Bonding Curve Progress */}
            <div className="bg-[#12121a] rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Bonding Curve Progress</h3>
                <span className="text-green-400 font-semibold">
                  {bondingProgress.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${bondingProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>23.067 SOL in bonding curve</span>
                <span>$51,362 to graduate</span>
              </div>
            </div>

            {/* Token Chat */}
            <div className="bg-[#12121a] rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <span className="text-xl">🦴</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{tokenTicker} chat</div>
                    <div className="text-xs text-gray-500">Chat with others</div>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Join chat
                </button>
              </div>
            </div>

            {/* Get Notified */}
            <div className="bg-[#12121a] rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">Get notified</div>
                  <div className="text-xs text-gray-500">
                    Get mobile app for coin notifications
                  </div>
                </div>
                <a href="#" className="text-green-400 text-sm hover:underline">
                  Find out more
                </a>
              </div>
            </div>

            {/* Top Holders */}
            <div className="bg-[#12121a] rounded-2xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h3 className="font-semibold">Top holders</h3>
                <button className="text-xs text-gray-400 hover:text-white transition-colors">
                  Generate bubble map
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {holders.map((holder, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {holder.icon && <span className="text-lg">{holder.icon}</span>}
                      <span
                        className={`font-mono text-sm ${
                          holder.icon ? 'text-white' : 'text-gray-400'
                        }`}
                      >
                        {holder.name}
                      </span>
                    </div>
                    <span className="text-sm">{holder.percent.toFixed(2)}%</span>
                  </div>
                ))}
                {holders.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Loading holders...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TokenTradePage;
