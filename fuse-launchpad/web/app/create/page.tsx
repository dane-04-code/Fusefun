"use client"

import { useState } from "react"
import { Upload, Rocket, Zap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { Keypair } from "@solana/web3.js"
import { FuseSDK } from "@/sdk/fuse-sdk"
import * as anchor from "@coral-xyz/anchor"

export default function CreateCoinPage() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [isMayhemMode, setIsMayhemMode] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [ticker, setTicker] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreate = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert("Please connect your wallet first")
      return
    }

    if (!name || !ticker || !description || !imageFile) {
      alert("Please fill in all fields and upload an image")
      return
    }

    try {
      setIsLoading(true)
      
      // 1. Upload Image to IPFS via Backend
      const formData = new FormData()
      formData.append("file", imageFile)

      const imageUploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/pinata/upload-image`, {
        method: "POST",
        body: formData,
      })

      if (!imageUploadRes.ok) {
        throw new Error("Failed to upload image")
      }

      const { ipfsUrl: imageUrl } = await imageUploadRes.json()
      console.log("Image uploaded:", imageUrl)

      // 2. Upload Metadata to IPFS via Backend
      const metadata = {
        name,
        symbol: ticker,
        description,
        image: imageUrl,
        properties: {
          files: [
            {
              uri: imageUrl,
              type: imageFile.type,
            },
          ],
        },
      }

      const metadataUploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/pinata/upload-metadata`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      })

      if (!metadataUploadRes.ok) {
        throw new Error("Failed to upload metadata")
      }

      const { ipfsUrl: metadataUri } = await metadataUploadRes.json()
      console.log("Metadata uploaded:", metadataUri)
      
      // 3. Initialize SDK and Create Token
      const sdk = new FuseSDK(connection, wallet as unknown as anchor.Wallet)

      // Generate a new mint keypair
      const mint = Keypair.generate()

      const tx = await sdk.buildCreateTokenTx(
        wallet.publicKey,
        mint,
        name,
        ticker,
        metadataUri,
        0 // Initial buy amount (optional)
      )

      // Send transaction
      const signature = await wallet.sendTransaction(tx, connection, {
        signers: [mint], // Mint needs to sign
      })

      await connection.confirmTransaction(signature, "confirmed")
      
      alert(`Token created! Signature: ${signature}`)
      
    } catch (error) {
      console.error("Error creating token:", error)
      alert("Failed to create token. See console for details.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl py-10 mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-2 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
          Launch a New Coin
        </h1>
        <p className="text-muted-foreground text-lg">
          Create your token on the FUSE.FUN launchpad in seconds.
        </p>
      </div>

      <Card className="border-2 border-gray-800 bg-gray-900/50 shadow-2xl backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-gray-800">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            Token Details
          </CardTitle>
          <CardDescription>
            Enter the basic information for your new Solana token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="image-upload" className="text-gray-200">Token Image</Label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800/70 hover:border-blue-500/50 transition-all duration-300"
              >
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Token Preview"
                    className="h-full w-full object-contain rounded-lg p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-400">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      SVG, PNG, JPG or GIF (MAX. 800x400px)
                    </p>
                  </div>
                )}
                <input
                  id="image-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-200">Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Bonk" 
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticker" className="text-gray-200">Ticker</Label>
              <Input 
                id="ticker" 
                placeholder="e.g. BONK" 
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-200">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell us about your token..."
              className="resize-none bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Mayhem Mode Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-700 p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-all">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-base text-gray-200">Mayhem Mode</Label>
                <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </div>
              <p className="text-sm text-gray-400">
                Enable anti-rug protection and sniper limits.
              </p>
            </div>
            <Switch
              checked={isMayhemMode}
              onCheckedChange={setIsMayhemMode}
            />
          </div>
        </CardContent>
        <CardFooter className="bg-gray-900/50 border-t border-gray-800">
          <Button 
            className="w-full text-lg py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300" 
            size="lg"
            onClick={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Launching...
              </span>
            ) : (
              <>
                <Rocket className="mr-2 h-5 w-5" />
                Launch Token
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
