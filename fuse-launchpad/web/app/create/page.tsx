"use client";

import { useState, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

interface TokenForm {
    name: string;
    ticker: string;
    description: string;
    image: string;
    imagePreview: string;
    twitter: string;
    telegram: string;
    website: string;
}

export default function CreateTokenPage() {
    const { connected } = useWallet();
    const { setVisible } = useWalletModal();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<TokenForm>({
        name: "",
        ticker: "",
        description: "",
        image: "",
        imagePreview: "",
        twitter: "",
        telegram: "",
        website: "",
    });

    const updateForm = (field: keyof TokenForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // Handle file selection
    const handleFileSelect = useCallback(async (file: File) => {
        setImageError(null);

        // Validate file type
        if (!file.type.startsWith("image/")) {
            setImageError("Please select an image file (PNG, JPG, GIF)");
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setImageError("Image must be less than 5MB");
            return;
        }

        // Create local preview
        const reader = new FileReader();
        reader.onload = (e) => {
            updateForm("imagePreview", e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to Pinata
        setImageUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/pinata/upload-image", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Upload failed");
            }

            const data = await response.json();
            updateForm("image", data.url);
            console.log("Image uploaded to IPFS:", data.url);
        } catch (error) {
            console.error("Upload error:", error);
            setImageError(error instanceof Error ? error.message : "Failed to upload image");
            updateForm("imagePreview", "");
        } finally {
            setImageUploading(false);
        }
    }, []);

    // Handle drag and drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    // Handle file input change
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    // Remove uploaded image
    const handleRemoveImage = useCallback(() => {
        updateForm("image", "");
        updateForm("imagePreview", "");
        setImageError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

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
        // TODO: Implement actual token launch with image URL
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsLoading(false);
    };

    const steps = [
        { id: 1, title: "Token Info" },
        { id: 2, title: "Social Links" },
        { id: 3, title: "Review" },
    ];

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">Create Token</h1>
                <p className="text-sm text-muted-foreground">
                    Launch your token with fair mechanics and anti-rug protection.
                </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                {steps.map((s, i) => (
                    <div key={s.id} className="flex items-center">
                        <div
                            className={`w-8 h-8 flex items-center justify-center text-sm font-mono transition-all border ${step >= s.id
                                ? "bg-primary text-black border-primary"
                                : "bg-black/40 border-white/10 text-muted-foreground"
                                }`}
                        >
                            {step > s.id ? "+" : s.id}
                        </div>
                        <span className={`ml-2 text-xs font-medium hidden sm:block ${step >= s.id ? "text-foreground" : "text-muted-foreground"}`}>
                            {s.title}
                        </span>
                        {i < steps.length - 1 && (
                            <div className={`w-12 h-px ml-4 ${step > s.id ? "bg-primary" : "bg-white/10"}`} />
                        )}
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Form */}
                <div className="bg-black/40 border border-white/10 p-6">
                    {step === 1 && (
                        <div className="space-y-5">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                                Step 1 - Token Information
                            </div>

                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => updateForm("name", e.target.value)}
                                    placeholder="e.g., Moon Cat"
                                    className="w-full px-4 py-3 bg-black/60 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Ticker</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                                    <input
                                        type="text"
                                        value={form.ticker}
                                        onChange={(e) => updateForm("ticker", e.target.value.toUpperCase())}
                                        placeholder="MCAT"
                                        maxLength={10}
                                        className="w-full pl-8 pr-4 py-3 bg-black/60 border border-white/10 text-sm font-mono text-primary uppercase focus:outline-none focus:border-primary/50 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => updateForm("description", e.target.value)}
                                    placeholder="Tell the world about your token..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-black/60 border border-white/10 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2">Token Image</label>

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/gif,image/webp"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                />

                                {form.imagePreview ? (
                                    // Image preview
                                    <div className="relative border border-white/20 p-2 bg-black/40">
                                        <img
                                            src={form.imagePreview}
                                            alt="Token preview"
                                            className="w-full h-40 object-contain"
                                        />
                                        {imageUploading && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                    Uploading to IPFS...
                                                </div>
                                            </div>
                                        )}
                                        {form.image && !imageUploading && (
                                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 text-green-400 text-[10px]">
                                                <CheckIcon className="w-3 h-3" /> Uploaded
                                            </div>
                                        )}
                                        <button
                                            onClick={handleRemoveImage}
                                            className="absolute top-3 left-3 p-1.5 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    // Upload area
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`border border-dashed p-6 text-center transition-all cursor-pointer ${
                                            isDragging
                                                ? "border-primary bg-primary/10"
                                                : "border-white/20 hover:border-primary/50 hover:bg-white/5"
                                        }`}
                                    >
                                        <div className="text-2xl mb-2">+</div>
                                        <p className="text-xs text-muted-foreground">
                                            Drop image or <span className="text-primary">browse</span>
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG, GIF up to 5MB</p>
                                    </div>
                                )}

                                {/* Error message */}
                                {imageError && (
                                    <p className="text-xs text-red-400 mt-2">{imageError}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                    Step 2 - Social Links
                                </div>
                                <span className="text-[10px] text-muted-foreground/60 uppercase">Optional</span>
                            </div>

                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <TwitterIcon className="w-3 h-3" /> X (Twitter)
                                </label>
                                <input
                                    type="text"
                                    value={form.twitter}
                                    onChange={(e) => updateForm("twitter", e.target.value)}
                                    placeholder="https://x.com/yourtoken"
                                    className="w-full px-4 py-3 bg-black/60 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <TelegramIcon className="w-3 h-3" /> Telegram
                                </label>
                                <input
                                    type="text"
                                    value={form.telegram}
                                    onChange={(e) => updateForm("telegram", e.target.value)}
                                    placeholder="https://t.me/yourtoken"
                                    className="w-full px-4 py-3 bg-black/60 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <GlobeIcon className="w-3 h-3" /> Website
                                </label>
                                <input
                                    type="text"
                                    value={form.website}
                                    onChange={(e) => updateForm("website", e.target.value)}
                                    placeholder="https://yourtoken.com"
                                    className="w-full px-4 py-3 bg-black/60 border border-white/10 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-5">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                                Step 3 - Review & Launch
                            </div>

                            <div className="space-y-0 border border-white/10">
                                <div className="flex justify-between px-4 py-3 border-b border-white/5">
                                    <span className="text-xs text-muted-foreground">Token Name</span>
                                    <span className="text-sm font-medium">{form.name || "Not set"}</span>
                                </div>
                                <div className="flex justify-between px-4 py-3 border-b border-white/5">
                                    <span className="text-xs text-muted-foreground">Ticker</span>
                                    <span className="text-sm font-mono text-primary">${form.ticker || "---"}</span>
                                </div>
                                <div className="flex justify-between px-4 py-3 border-b border-white/5">
                                    <span className="text-xs text-muted-foreground">Image</span>
                                    <span className={`text-sm ${form.image ? "text-green-400" : "text-muted-foreground"}`}>
                                        {form.image ? "Uploaded to IPFS" : "No image"}
                                    </span>
                                </div>
                                <div className="flex justify-between px-4 py-3 border-b border-white/5">
                                    <span className="text-xs text-muted-foreground">Network</span>
                                    <span className="text-sm font-medium flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-purple-400 animate-pulse" /> Solana
                                    </span>
                                </div>
                                <div className="flex justify-between px-4 py-3">
                                    <span className="text-xs text-muted-foreground">Launch Cost</span>
                                    <span className="text-sm font-medium text-green-400">0.075 SOL</span>
                                </div>
                            </div>

                            <div className="bg-green-500/10 border border-green-500/20 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="text-lg">+</div>
                                    <div>
                                        <div className="text-xs font-medium text-green-400 mb-1">Anti-Rug Protection</div>
                                        <p className="text-[11px] text-green-400/70 leading-relaxed">
                                            Liquidity is automatically locked. Team tokens are vested. You cannot rug your holders.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                        <button
                            onClick={handleBack}
                            disabled={step === 1}
                            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0"
                        >
                            Back
                        </button>

                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                disabled={step === 1 && (!form.name || !form.ticker)}
                                className="px-6 py-2 bg-primary text-black text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={handleLaunch}
                                disabled={isLoading}
                                className="px-6 py-2.5 bg-primary text-black text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Launching...
                                    </>
                                ) : connected ? (
                                    "Launch Token"
                                ) : (
                                    "Connect Wallet"
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Live Preview */}
                <div className="lg:sticky lg:top-24 h-fit">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Preview</div>

                    <div className="bg-black/60 border border-white/10 overflow-hidden">
                        {/* Header */}
                        <div className="h-20 bg-gradient-to-br from-white/5 to-black relative border-b border-white/5">
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/10 text-2xl font-mono uppercase">
                                {form.ticker || "TICKER"}
                            </div>
                        </div>

                        <div className="p-5 relative">
                            {/* Avatar */}
                            <div className="absolute -top-6 left-5 w-12 h-12 border-2 border-black overflow-hidden">
                                {form.imagePreview ? (
                                    <img
                                        src={form.imagePreview}
                                        alt="Token"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-xl">
                                        $
                                    </div>
                                )}
                            </div>

                            <div className="mt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-lg font-bold">{form.name || "Token Name"}</h2>
                                        <p className="text-primary font-mono text-sm">${form.ticker || "TICKER"}</p>
                                    </div>
                                    <div className="text-[10px] text-green-400 px-2 py-1 bg-green-500/10 border border-green-500/20">
                                        MC: $0
                                    </div>
                                </div>

                                {form.description && (
                                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                                        {form.description}
                                    </p>
                                )}

                                {/* Progress */}
                                <div className="mt-5">
                                    <div className="flex justify-between text-[10px] mb-1">
                                        <span className="text-muted-foreground">Bonding Progress</span>
                                        <span className="text-primary font-mono">0%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5">
                                        <div className="h-full bg-primary w-[0%]" />
                                    </div>
                                </div>

                                {/* Socials */}
                                <div className="mt-4 flex gap-2">
                                    {[
                                        { active: form.twitter, icon: TwitterIcon },
                                        { active: form.telegram, icon: TelegramIcon },
                                        { active: form.website, icon: GlobeIcon }
                                    ].map((social, i) => (
                                        <div
                                            key={i}
                                            className={`w-7 h-7 flex items-center justify-center border transition-all ${social.active
                                                ? "bg-white/5 border-white/20 text-foreground"
                                                : "border-white/5 text-muted-foreground/30"
                                                }`}
                                        >
                                            <social.icon className="w-3 h-3" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-white/5 border border-white/10 text-[10px] text-muted-foreground">
                        Preview updates as you type. This is how your token will appear on the launchpad.
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

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}
