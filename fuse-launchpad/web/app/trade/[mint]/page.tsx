"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { FuseSDK, TokenInfo } from "@/sdk/fuse-sdk"
import * as anchor from "@coral-xyz/anchor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

export default function TradePage() {
  const params = useParams()
  const mintAddress = params.mint as string
  const { connection } = useConnection()
  const wallet = useWallet()
  
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState("")
  const [tradeLoading, setTradeLoading] = useState(false)

  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!mintAddress) return
      try {
        // We don't need a wallet to fetch read-only data, but SDK constructor requires it currently.
        // We can pass a dummy wallet or make it optional in SDK.
        // For now, let's just use the connected wallet or a dummy if not connected.
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
      } finally {
        setLoading(false)
      }
    }

    fetchTokenInfo()
    const interval = setInterval(fetchTokenInfo, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [mintAddress, connection, wallet.publicKey])

  const handleBuy = async () => {
    if (!wallet.publicKey || !tokenInfo) return
    try {
      setTradeLoading(true)
      const sdk = new FuseSDK(connection, wallet as unknown as anchor.Wallet)
      const solAmount = FuseSDK.parseSolToLamports(amount)
      const minTokensOut = 0n // TODO: Calculate slippage

      const tx = await sdk.buildBuyTx(
        wallet.publicKey,
        tokenInfo.mint,
        solAmount,
        minTokensOut
      )

      const signature = await wallet.sendTransaction(tx, connection)
      await connection.confirmTransaction(signature, "confirmed")
      alert("Buy successful!")
      setAmount("")
    } catch (error) {
      console.error("Buy error:", error)
      alert("Buy failed")
    } finally {
      setTradeLoading(false)
    }
  }

  const handleSell = async () => {
    if (!wallet.publicKey || !tokenInfo) return
    try {
      setTradeLoading(true)
      const sdk = new FuseSDK(connection, wallet as unknown as anchor.Wallet)
      // TODO: Parse token amount with decimals (assuming 6 for now)
      const tokenAmount = BigInt(Math.floor(Number(amount) * 1_000_000)) 
      const minSolOut = 0n // TODO: Calculate slippage

      const tx = await sdk.buildSellTx(
        wallet.publicKey,
        tokenInfo.mint,
        tokenAmount,
        minSolOut
      )

      const signature = await wallet.sendTransaction(tx, connection)
      await connection.confirmTransaction(signature, "confirmed")
      alert("Sell successful!")
      setAmount("")
    } catch (error) {
      console.error("Sell error:", error)
      alert("Sell failed")
    } finally {
      setTradeLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>
  }

  if (!tokenInfo) {
    return <div className="container py-10 text-center">Token not found or invalid mint address</div>
  }

  return (
    <div className="container py-10 mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Chart & Info Section */}
      <div className="md:col-span-2 space-y-6">
        <div className="flex items-center gap-4">
          {/* Placeholder for image */}
          <div className="w-16 h-16 bg-gray-700 rounded-full overflow-hidden">
             {tokenInfo.uri && <img src={tokenInfo.uri} alt={tokenInfo.name} className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{tokenInfo.name} ({tokenInfo.symbol})</h1>
            <p className="text-muted-foreground">Market Cap: {FuseSDK.formatSol(tokenInfo.marketCap)} SOL</p>
            <p className="text-sm text-muted-foreground">Creator: {tokenInfo.creator.toBase58().slice(0, 6)}...{tokenInfo.creator.toBase58().slice(-4)}</p>
          </div>
        </div>
        
        <Card className="h-[400px] flex items-center justify-center bg-gray-900/50">
          <p className="text-muted-foreground">Trading Chart Placeholder</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bonding Curve Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={tokenInfo.bondingProgress} />
            <p className="text-sm text-muted-foreground text-right">{tokenInfo.bondingProgress.toFixed(2)}%</p>
            <p className="text-sm">
              When the market cap reaches ~85 SOL, all liquidity is deposited into Raydium and burned.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trading Interface */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Trade {tokenInfo.symbol}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="buy">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500">Buy</TabsTrigger>
                <TabsTrigger value="sell" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500">Sell</TabsTrigger>
              </TabsList>
              
              <TabsContent value="buy" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (SOL)</label>
                  <Input 
                    type="number" 
                    placeholder="0.0" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700" 
                  onClick={handleBuy}
                  disabled={tradeLoading || !wallet.publicKey}
                >
                  {tradeLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                  Buy {tokenInfo.symbol}
                </Button>
              </TabsContent>

              <TabsContent value="sell" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount ({tokenInfo.symbol})</label>
                  <Input 
                    type="number" 
                    placeholder="0.0" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700" 
                  onClick={handleSell}
                  disabled={tradeLoading || !wallet.publicKey}
                >
                  {tradeLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                  Sell {tokenInfo.symbol}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}