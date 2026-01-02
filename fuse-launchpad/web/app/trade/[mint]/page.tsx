"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { FuseSDK, TokenInfo } from "@/sdk/fuse-sdk"
import { useReferral } from "@/components/providers/ReferralProvider"
import * as anchor from "@coral-xyz/anchor"

// X Profile interface
interface XProfile {
  username: string;
  displayName: string;
  profileImage: string;
  verified: boolean;
  connectedAt: string;
}

// Mock token data for development
const MOCK_TOKEN: TokenInfo = {
  mint: PublicKey.default,
  curve: PublicKey.default,
  name: "Sample Token",
  symbol: "SAMPLE",
  uri: "",
  price: 0.000000085,
  marketCap: 85,
  bondingProgress: 67.5,
  isGraduated: false,
  creator: PublicKey.default,
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
  const [slippage, setSlippage] = useState("1")
  const [chartReady, setChartReady] = useState(false)
  const [creatorXProfile, setCreatorXProfile] = useState<XProfile | null>(null)
  const [userSolBalance, setUserSolBalance] = useState<number>(0)
  const [userTokenBalance, setUserTokenBalance] = useState<bigint>(0n)

  // Fetch user balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!wallet.publicKey || !mintAddress) return;
      try {
        const solBalance = await connection.getBalance(wallet.publicKey);
        setUserSolBalance(solBalance / 1e9);

        const dummyWallet = {
          publicKey: wallet.publicKey,
          signTransaction: async () => { throw new Error("Read only") },
          signAllTransactions: async () => { throw new Error("Read only") }
        } as unknown as anchor.Wallet;
        const sdk = new FuseSDK(connection, dummyWallet);
        const mint = new PublicKey(mintAddress);
        const tokenBalance = await sdk.getUserBalance(mint, wallet.publicKey);
        setUserTokenBalance(tokenBalance);
      } catch (e) {
        console.error("Error fetching balances:", e);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [wallet.publicKey, mintAddress, connection]);

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
        setTokenInfo({
          ...MOCK_TOKEN,
          mint: new PublicKey(mintAddress),
          name: "Demo Token",
          symbol: "DEMO",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTokenInfo()
  }, [mintAddress, connection, wallet])

  // Load TradingView widget
  useEffect(() => {
    if (!tokenInfo || !chartContainerRef.current) return

    const loadTradingView = () => {
      if (typeof window !== 'undefined' && (window as any).TradingView) {
        new (window as any).TradingView.widget({
          container_id: "tradingview_chart",
          symbol: "BINANCE:SOLUSDT",
          interval: "5",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#000000",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          withdateranges: true,
          allow_symbol_change: false,
          autosize: true,
          backgroundColor: "#000000",
          gridColor: "rgba(255, 255, 255, 0.05)",
        });
        setChartReady(true);
      }
    };

    // Load TradingView script
    if (!(window as any).TradingView) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = loadTradingView;
      document.head.appendChild(script);
    } else {
      loadTradingView();
    }
  }, [tokenInfo]);

  // Fetch creator X profile
  useEffect(() => {
    const fetchCreatorXProfile = async () => {
      if (!tokenInfo?.creator) return;
      try {
        const creatorAddress = tokenInfo.creator.toBase58();
        const storedProfiles = localStorage.getItem('fusefun_x_profiles');
        if (storedProfiles) {
          const profiles = JSON.parse(storedProfiles);
          if (profiles[creatorAddress]) {
            setCreatorXProfile(profiles[creatorAddress]);
          }
        }
      } catch (e) {
        console.error("Error fetching creator profile:", e);
      }
    };

    fetchCreatorXProfile();
  }, [tokenInfo]);

  // Get referral context for auto-registration
  const { isRegistered, registerAndLinkReferrer, referrerAddress } = useReferral();

  const handleBuy = async () => {
    if (!wallet.publicKey) {
      alert("Please connect your wallet first!");
      return;
    }
    if (!tokenInfo) {
      alert("Token info not loaded!");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount!");
      return;
    }

    try {
      setTradeLoading(true);
      const sdk = new FuseSDK(connection, wallet as unknown as anchor.Wallet);
      const solAmount = FuseSDK.parseSolToLamports(amount);
      const minTokensOut = 0n;

      const tx = await sdk.buildBuyTx(
        wallet.publicKey,
        tokenInfo.mint,
        solAmount,
        minTokensOut
      );

      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      setAmount("");
      alert(`Successfully bought ${tokenInfo.symbol}! Transaction: ${signature.slice(0, 8)}...`);
    } catch (error: any) {
      console.error("Buy error:", error);
      const errorMsg = error.message || "Transaction failed";
      if (errorMsg.includes("User rejected")) {
        alert("Transaction cancelled.");
      } else if (errorMsg.includes("insufficient")) {
        alert("Insufficient SOL balance.");
      } else {
        alert(`Buy failed: ${errorMsg}`);
      }
    } finally {
      setTradeLoading(false);
    }
  };

  const handleSell = async () => {
    if (!wallet.publicKey) {
      alert("Please connect your wallet first!");
      return;
    }
    if (!tokenInfo) {
      alert("Token info not loaded!");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount!");
      return;
    }

    try {
      setTradeLoading(true);
      const sdk = new FuseSDK(connection, wallet as unknown as anchor.Wallet);
      const tokenAmount = BigInt(Math.floor(parseFloat(amount) * 1_000_000));
      const minSolOut = 0n;

      const tx = await sdk.buildSellTx(
        wallet.publicKey,
        tokenInfo.mint,
        tokenAmount,
        minSolOut
      );

      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      setAmount("");
      alert(`Successfully sold ${tokenInfo.symbol}! Transaction: ${signature.slice(0, 8)}...`);
    } catch (error: any) {
      console.error("Sell error:", error);
      const errorMsg = error.message || "Transaction failed";
      if (errorMsg.includes("User rejected")) {
        alert("Transaction cancelled.");
      } else if (errorMsg.includes("insufficient")) {
        alert("Insufficient token balance.");
      } else {
        alert(`Sell failed: ${errorMsg}`);
      }
    } finally {
      setTradeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading token data...</p>
        </div>
      </div>
    )
  }

  if (!tokenInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black gap-4">
        <div className="text-6xl">🔍</div>
        <h2 className="text-2xl font-bold">Token Not Found</h2>
        <p className="text-muted-foreground">Invalid mint address or token doesn&apos;t exist</p>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-black flex flex-col lg:flex-row overflow-hidden">
      {/* Chart Section - Takes most of the screen */}
      <div className="flex-1 relative">
        {/* TradingView Chart Container */}
        <div
          id="tradingview_chart"
          ref={chartContainerRef}
          className="w-full h-full"
        />

        {/* Chart Loading State */}
        {!chartReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading TradingView chart...</p>
            </div>
          </div>
        )}
      </div>

      {/* Trading Panel - Right Side */}
      <div className="w-full lg:w-[360px] flex flex-col bg-black/60 border-l border-white/10 overflow-y-auto">
        {/* Token Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center font-bold text-lg">
            {tokenInfo.symbol.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{tokenInfo.name}</h1>
            <p className="text-sm text-muted-foreground">${tokenInfo.symbol}</p>
          </div>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="grid grid-cols-2 p-3 gap-2">
          <button
            onClick={() => setActiveTab("buy")}
            className={`py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === "buy"
              ? "bg-primary text-black shadow-lg shadow-primary/30"
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
          >
            Buy
          </button>
          <button
            onClick={() => setActiveTab("sell")}
            className={`py-3 rounded-lg font-semibold text-sm transition-all ${activeTab === "sell"
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
              }`}
          >
            Sell
          </button>
        </div>

        {/* Amount Section */}
        <div className="px-3 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Amount</span>
            <span className="text-xs text-muted-foreground">
              {activeTab === "buy"
                ? `Balance: ${userSolBalance.toFixed(4)} SOL`
                : `Balance: ${FuseSDK.formatTokens(userTokenBalance)} ${tokenInfo?.symbol || 'tokens'}`
              }
            </span>
          </div>

          {/* Amount Input */}
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={activeTab === "buy" ? "Enter SOL amount" : "Enter token amount"}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-4 text-lg font-semibold focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {activeTab === "buy" ? "SOL" : tokenInfo.symbol}
            </span>
          </div>

          {/* Slippage */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Slippage Tolerance</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-center text-xs"
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-3 pb-4">
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
            ) : !wallet.publicKey ? (
              "Connect Wallet"
            ) : (
              `${activeTab === "buy" ? "Buy" : "Sell"} ${tokenInfo.symbol}`
            )}
          </button>
        </div>

        {/* Token Info */}
        <div className="border-t border-white/10 p-4 space-y-4">
          {/* Creator */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Creator</p>
            <div className="flex items-center gap-3">
              {creatorXProfile ? (
                <>
                  <div className="relative">
                    <img
                      src={creatorXProfile.profileImage}
                      alt={creatorXProfile.displayName}
                      className="w-8 h-8 object-cover rounded-full border border-[#1DA1F2]/50"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#1DA1F2] rounded-full flex items-center justify-center">
                      <XIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-sm">{creatorXProfile.displayName}</span>
                    <a
                      href={`https://x.com/${creatorXProfile.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-[#1DA1F2] hover:underline"
                    >
                      @{creatorXProfile.username}
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-sm font-mono text-muted-foreground">
                  {tokenInfo?.creator.toBase58().slice(0, 4)}...{tokenInfo?.creator.toBase58().slice(-4)}
                </p>
              )}
            </div>
          </div>

          {/* Bonding Curve Progress */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Bonding Progress</span>
              <span className="text-xs font-semibold text-primary">{tokenInfo.bondingProgress.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-black/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${tokenInfo.bondingProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              When complete, liquidity migrates to Raydium
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// X Icon component
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}