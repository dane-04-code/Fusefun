"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { FuseSDK, TokenInfo } from "@/sdk/fuse-sdk"
import * as anchor from "@coral-xyz/anchor"

// Mock token data for development
const MOCK_TOKEN: TokenInfo = {
  mint: PublicKey.default,
  name: "Sample Token",
  symbol: "SAMPLE",
  uri: "",
  creator: PublicKey.default,
  realSolReserves: BigInt(50000000000),
  virtualSolReserves: BigInt(30000000000000),
  tokenReserves: BigInt(800000000000000),
  totalSupply: BigInt(1000000000000000),
  marketCap: BigInt(85000000000),
  bondingProgress: 67.5,
  isComplete: false,
}

export default function TradePage() {
  const params = useParams()
  const mintAddress = params.mint as string
  const { connection } = useConnection()
  const wallet = useWallet()
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState("")
  const [tradeLoading, setTradeLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy")
  const [orderType, setOrderType] = useState<"market" | "limit" | "adv">("market")
  const [slippage, setSlippage] = useState("1")
  const [chartReady, setChartReady] = useState(false)

  // Quick amount presets
  const amountPresets = ["0.1", "0.15", "0.2", "0.3"]

  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!mintAddress) return
      try {
        const dummyWallet = {
          publicKey: PublicKey.default,
          signTransaction: async () => { throw new Error("Read only") },
          signAllTransactions: async () => { throw new Error("Read only") }
        } as unknown as anchor.Wallet

        const sdk = new FuseSDK(connection, wallet.publicKey ? (wallet as unknown as anchor.Wallet) : dummyWallet)
        const mint = new PublicKey(mintAddress)
        const info = await sdk.getTokenInfo(mint)
        setTokenInfo(info)
      } catch (error) {
        console.error("Error fetching token info:", error)
        // Use mock data for development
        setTokenInfo({ ...MOCK_TOKEN, symbol: mintAddress.slice(0, 4).toUpperCase() })
      } finally {
        setLoading(false)
      }
    }

    fetchTokenInfo()
    const interval = setInterval(fetchTokenInfo, 10000)
    return () => clearInterval(interval)
  }, [mintAddress, connection, wallet.publicKey])

  // Initialize TradingView Widget
  useEffect(() => {
    if (!chartContainerRef.current || chartReady) return

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (typeof (window as any).TradingView !== 'undefined') {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: "BINANCE:SOLUSDT",
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: "tradingview_chart",
          hide_volume: false,
          backgroundColor: "rgba(0, 0, 0, 0)",
        })
        setChartReady(true)
      }
    }
    document.head.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [chartReady])

  const handleBuy = async () => {
    if (!wallet.publicKey || !tokenInfo) return
    try {
      setTradeLoading(true)
      const sdk = new FuseSDK(connection, wallet as unknown as anchor.Wallet)
      const solAmount = FuseSDK.parseSolToLamports(amount)
      const minTokensOut = 0n

      const tx = await sdk.buildBuyTx(
        wallet.publicKey,
        tokenInfo.mint,
        solAmount,
        minTokensOut
      )

      const signature = await wallet.sendTransaction(tx, connection)
      await connection.confirmTransaction(signature, "confirmed")
      setAmount("")
    } catch (error) {
      console.error("Buy error:", error)
    } finally {
      setTradeLoading(false)
    }
  }

  const handleSell = async () => {
    if (!wallet.publicKey || !tokenInfo) return
    try {
      setTradeLoading(true)
      const sdk = new FuseSDK(connection, wallet as unknown as anchor.Wallet)
      const tokenAmount = BigInt(Math.floor(Number(amount) * 1_000_000))
      const minSolOut = 0n

      const tx = await sdk.buildSellTx(
        wallet.publicKey,
        tokenInfo.mint,
        tokenAmount,
        minSolOut
      )

      const signature = await wallet.sendTransaction(tx, connection)
      await connection.confirmTransaction(signature, "confirmed")
      setAmount("")
    } catch (error) {
      console.error("Sell error:", error)
    } finally {
      setTradeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading token data...</p>
        </div>
      </div>
    )
  }

  if (!tokenInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">🔍</div>
        <h2 className="text-2xl font-bold">Token Not Found</h2>
        <p className="text-muted-foreground">Invalid mint address or token doesn&apos;t exist</p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen">
      {/* Top Toolbar */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
            <span className="text-xs text-muted-foreground">1s</span>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-lg text-sm text-muted-foreground hover:text-white transition-colors">
            📊 Indicators
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-lg text-sm text-muted-foreground hover:text-white transition-colors">
            ⚙️ Display Options
          </button>
          <div className="h-4 w-px bg-white/10" />
          <button className="px-3 py-1.5 hover:bg-white/5 rounded-lg text-sm text-muted-foreground hover:text-white transition-colors">
            USD/SOL
          </button>
          <button className="px-3 py-1.5 hover:bg-white/5 rounded-lg text-sm text-muted-foreground hover:text-white transition-colors">
            MarketCap/Price
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-xs font-bold">
                {tokenInfo.symbol.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold">{tokenInfo.symbol}/USD</p>
                <p className="text-xs text-muted-foreground">on Fuse AMM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-180px)]">
        {/* Chart Section */}
        <div className="flex-1 relative bg-black/20">
          {/* TradingView Chart Container */}
          <div
            id="tradingview_chart"
            ref={chartContainerRef}
            className="w-full h-full min-h-[400px]"
          />

          {/* Chart Loading State */}
          {!chartReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading chart...</p>
              </div>
            </div>
          )}

          {/* Chart Timeframe Selector */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-1">
            {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
              <button
                key={tf}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Trading Panel */}
        <div className="w-full lg:w-[340px] border-l border-white/5 bg-black/40 backdrop-blur-xl flex flex-col">
          {/* Token Stats Header */}
          <div className="grid grid-cols-4 gap-1 p-3 border-b border-white/5 text-center text-xs">
            <div>
              <p className="text-muted-foreground">5m Vol</p>
              <p className="font-semibold text-white">$8.17K</p>
            </div>
            <div>
              <p className="text-muted-foreground">Buys</p>
              <p className="font-semibold text-primary">60 / $2.91K</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sells</p>
              <p className="font-semibold text-red-400">40 / $5.26K</p>
            </div>
            <div>
              <p className="text-muted-foreground">Net Vol</p>
              <p className="font-semibold text-red-400">-$2.35K</p>
            </div>
          </div>

          {/* Buy/Sell Toggle */}
          <div className="grid grid-cols-2 p-3 gap-2">
            <button
              onClick={() => setActiveTab("buy")}
              className={`py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === "buy"
                  ? "bg-primary text-black shadow-lg shadow-primary/30"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
            >
              Buy
            </button>
            <button
              onClick={() => setActiveTab("sell")}
              className={`py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === "sell"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
            >
              Sell
            </button>
          </div>

          {/* Order Type Selector */}
          <div className="flex items-center gap-1 px-3 pb-3">
            {(["market", "limit", "adv"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${orderType === type
                    ? "bg-white/10 text-white"
                    : "text-muted-foreground hover:text-white"
                  }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Amount Section */}
          <div className="px-3 pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">AMOUNT</span>
              <span className="text-xs text-muted-foreground">◎ 0</span>
            </div>

            {/* Preset Amounts */}
            <div className="grid grid-cols-4 gap-2">
              {amountPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${amount === preset
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-white/5 text-white hover:bg-white/10"
                    }`}
                >
                  {preset}
                </button>
              ))}
              <button className="py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-colors">
                ✏️
              </button>
            </div>

            {/* Custom Amount Input */}
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-right text-lg font-semibold focus:outline-none focus:border-primary/50 transition-colors"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                ◎
              </span>
            </div>

            {/* Slippage & Options */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">⚙️ {slippage}%</span>
                <span className="text-primary">🛡️ 0.0↓▲</span>
                <span className="text-primary">🎯 0.0↑▲</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="sr-only" />
                <span className="text-muted-foreground">✖ Off</span>
              </label>
            </div>

            {/* Advanced Strategy */}
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-white transition-colors">
              <input type="checkbox" className="w-4 h-4 bg-white/5 border-white/20 rounded" />
              Advanced Trading Strategy
            </label>
          </div>

          {/* Action Button */}
          <div className="px-3 pb-3">
            <button
              onClick={activeTab === "buy" ? handleBuy : handleSell}
              disabled={tradeLoading || !wallet.publicKey || !amount}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === "buy"
                  ? "bg-gradient-to-r from-primary to-emerald-500 text-black shadow-lg shadow-primary/30 hover:shadow-primary/50"
                  : "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
                }`}
            >
              {tradeLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                `${activeTab === "buy" ? "Buy" : "Sell"} ${tokenInfo.symbol}`
              )}
            </button>
          </div>

          {/* Position Stats */}
          <div className="grid grid-cols-4 gap-1 px-3 pb-3 text-center text-xs">
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-muted-foreground">Bought</p>
              <p className="font-semibold text-primary">$0</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-muted-foreground">Sold</p>
              <p className="font-semibold text-red-400">$0</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-muted-foreground">Holding</p>
              <p className="font-semibold">$0</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-muted-foreground">PnL</p>
              <p className="font-semibold text-muted-foreground">+$0 (+0%)</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-2 px-3 pb-3">
            <button className="py-2 bg-primary/20 text-primary rounded-lg text-xs font-semibold">
              PRESET 1
            </button>
            <button className="py-2 bg-white/5 text-muted-foreground rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors">
              PRESET 2
            </button>
            <button className="py-2 bg-white/5 text-muted-foreground rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors">
              PRESET 3
            </button>
          </div>

          {/* Token Info Section */}
          <div className="flex-1 overflow-y-auto border-t border-white/5">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-sm font-semibold">Token Info</span>
              <button className="text-muted-foreground hover:text-white transition-colors">
                🔍
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 text-xs">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-primary font-bold">27.44%</p>
                <p className="text-muted-foreground">Top 10 H.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-primary font-bold">3.25%</p>
                <p className="text-muted-foreground">Dev H.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-primary font-bold">3.25%</p>
                <p className="text-muted-foreground">Snipers H.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-primary font-bold">2.84%</p>
                <p className="text-muted-foreground">Insiders</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-primary font-bold">0.03%</p>
                <p className="text-muted-foreground">Bundlers</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-primary font-bold">100%</p>
                <p className="text-muted-foreground">LP Burned</p>
              </div>
            </div>

            {/* Bonding Curve Progress */}
            <div className="px-3 pb-3">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Bonding Progress</span>
                  <span className="text-xs font-semibold text-primary">{tokenInfo.bondingProgress.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${tokenInfo.bondingProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  When complete, all liquidity migrates to Raydium
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}