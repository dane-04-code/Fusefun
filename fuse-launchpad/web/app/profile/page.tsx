"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Types
interface ManagedWallet {
    id: string;
    name: string;
    publicKey: string;
    balance: number;
    holdings: number;
}

// Mock data
const mockPortfolio = [
    { id: "1", name: "PepeSol", ticker: "$PSOL", balance: "1,234,567", value: "$456.78", pnl: "+23.5%" },
    { id: "2", name: "MoonCat", ticker: "$MCAT", balance: "890,000", value: "$312.45", pnl: "+156.2%" },
    { id: "3", name: "FireDog", ticker: "$FDOG", balance: "2,500,000", value: "$89.12", pnl: "-12.3%" },
];

type TabType = "wallets" | "created" | "portfolio";

export default function ProfilePage() {
    const { connected, publicKey, disconnect } = useWallet();
    const { setVisible } = useWalletModal();
    const [activeTab, setActiveTab] = useState<TabType>("wallets");

    // Wallet management state
    const [wallets, setWallets] = useState<ManagedWallet[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [newWalletData, setNewWalletData] = useState<{ publicKey: string; privateKey: string } | null>(null);
    const [importPrivateKey, setImportPrivateKey] = useState("");
    const [importWalletName, setImportWalletName] = useState("");
    const [newWalletName, setNewWalletName] = useState("");
    const [copiedKey, setCopiedKey] = useState(false);

    // Load wallets from localStorage on mount
    useEffect(() => {
        const savedWallets = localStorage.getItem("fusefun_wallets");
        if (savedWallets) {
            try {
                setWallets(JSON.parse(savedWallets));
            } catch (e) {
                console.error("Error loading wallets:", e);
            }
        }
    }, []);

    // Save wallets to localStorage whenever they change
    useEffect(() => {
        if (wallets.length > 0) {
            localStorage.setItem("fusefun_wallets", JSON.stringify(wallets));
        }
    }, [wallets]);

    // Create a new wallet
    const createWallet = () => {
        const keypair = Keypair.generate();
        const publicKeyStr = keypair.publicKey.toBase58();
        const privateKeyStr = bs58.encode(keypair.secretKey);

        setNewWalletData({
            publicKey: publicKeyStr,
            privateKey: privateKeyStr
        });
    };

    // Save the created wallet
    const saveCreatedWallet = () => {
        if (newWalletData) {
            const newWallet: ManagedWallet = {
                id: Date.now().toString(),
                name: newWalletName || "Wallet",
                publicKey: newWalletData.publicKey,
                balance: 0,
                holdings: 0,
            };
            setWallets(prev => [...prev, newWallet]);
            setNewWalletData(null);
            setShowCreateModal(false);
            setNewWalletName("");
        }
    };

    // Import wallet from private key
    const importWallet = () => {
        try {
            const secretKey = bs58.decode(importPrivateKey);
            const keypair = Keypair.fromSecretKey(secretKey);
            const publicKeyStr = keypair.publicKey.toBase58();

            if (wallets.some(w => w.publicKey === publicKeyStr)) {
                alert("This wallet is already added!");
                return;
            }

            const newWallet: ManagedWallet = {
                id: Date.now().toString(),
                name: importWalletName || "Wallet",
                publicKey: publicKeyStr,
                balance: 0,
                holdings: 0,
            };
            setWallets(prev => [...prev, newWallet]);
            setImportPrivateKey("");
            setImportWalletName("");
            setShowImportModal(false);
        } catch {
            alert("Invalid private key format");
        }
    };

    // Delete a wallet
    const deleteWallet = (id: string) => {
        if (confirm("Are you sure you want to remove this wallet?")) {
            setWallets(prev => prev.filter(w => w.id !== id));
        }
    };

    // Copy to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    if (!connected) {
        return (
            <div className="max-w-lg mx-auto text-center py-20">
                <div className="w-16 h-16 border border-white/10 bg-black/40 flex items-center justify-center mx-auto mb-6">
                    <WalletIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold mb-2 tracking-tight">Connect Wallet</h1>
                <p className="text-muted-foreground mb-8 text-sm">
                    Connect your Solana wallet to view your profile and manage your tokens.
                </p>
                <button
                    onClick={() => setVisible(true)}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold text-sm transition-all"
                >
                    Connect Wallet
                </button>
            </div>
        );
    }

    const address = publicKey?.toBase58() || "";

    return (
        <div className="max-w-5xl mx-auto">
            {/* Minimal Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <span className="text-primary font-mono text-sm font-bold">
                            {address.slice(0, 2)}
                        </span>
                    </div>
                    <div>
                        <div className="font-mono text-sm text-foreground">
                            {address.slice(0, 8)}...{address.slice(-8)}
                        </div>
                        <button
                            onClick={() => copyToClipboard(address)}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            Copy address
                        </button>
                    </div>
                </div>
                <button
                    onClick={disconnect}
                    className="px-4 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all"
                >
                    Disconnect
                </button>
            </div>

            {/* Tabs - Clean underline style */}
            <div className="flex gap-8 mb-8 border-b border-white/10">
                {[
                    { id: "wallets" as const, label: "Wallets" },
                    { id: "created" as const, label: "Created Tokens" },
                    { id: "portfolio" as const, label: "Portfolio" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 text-sm font-medium transition-all relative ${
                            activeTab === tab.id
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-primary" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {/* Wallets Tab */}
                {activeTab === "wallets" && (
                    <div>
                        {/* Actions */}
                        <div className="flex items-center gap-3 mb-6">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="px-4 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                            >
                                Import Wallet
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateModal(true);
                                    createWallet();
                                }}
                                className="px-4 py-2 text-xs font-medium bg-primary hover:bg-primary/90 text-black transition-all"
                            >
                                Create Wallet
                            </button>
                        </div>

                        {/* Wallet List */}
                        <div className="border border-white/10 bg-black/20">
                            {/* Header */}
                            <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-white/10 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                <div>Wallet</div>
                                <div className="text-center">Balance</div>
                                <div className="text-center">Holdings</div>
                                <div className="text-right">Actions</div>
                            </div>

                            {/* Rows */}
                            {wallets.length === 0 ? (
                                <div className="px-4 py-12 text-center">
                                    <p className="text-muted-foreground text-sm mb-4">No wallets added</p>
                                    <button
                                        onClick={() => {
                                            setShowCreateModal(true);
                                            createWallet();
                                        }}
                                        className="text-primary text-sm hover:underline"
                                    >
                                        Create your first wallet
                                    </button>
                                </div>
                            ) : (
                                wallets.map((wallet) => (
                                    <div
                                        key={wallet.id}
                                        className="grid grid-cols-4 gap-4 px-4 py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                                <SolanaIcon className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{wallet.name}</div>
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    {wallet.publicKey.slice(0, 4)}...{wallet.publicKey.slice(-4)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="font-mono text-sm">{wallet.balance} SOL</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="text-sm text-muted-foreground">{wallet.holdings} tokens</span>
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => copyToClipboard(wallet.publicKey)}
                                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                                                title="Copy address"
                                            >
                                                <CopyIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteWallet(wallet.id)}
                                                className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                title="Remove wallet"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Created Tokens Tab */}
                {activeTab === "created" && (
                    <div className="border border-white/10 bg-black/20 px-4 py-12 text-center">
                        <p className="text-muted-foreground text-sm mb-4">No tokens created yet</p>
                        <a
                            href="/create"
                            className="inline-block px-6 py-2.5 bg-primary hover:bg-primary/90 text-black font-bold text-sm transition-all"
                        >
                            Create Token
                        </a>
                    </div>
                )}

                {/* Portfolio Tab */}
                {activeTab === "portfolio" && (
                    <div className="border border-white/10 bg-black/20">
                        {/* Header */}
                        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-white/10 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            <div>Token</div>
                            <div className="text-right">Balance</div>
                            <div className="text-right">Value</div>
                            <div className="text-right">PnL</div>
                            <div className="text-right">Action</div>
                        </div>

                        {/* Rows */}
                        {mockPortfolio.length === 0 ? (
                            <div className="px-4 py-12 text-center">
                                <p className="text-muted-foreground text-sm">No tokens in portfolio</p>
                            </div>
                        ) : (
                            mockPortfolio.map((token) => (
                                <div
                                    key={token.id}
                                    className="grid grid-cols-5 gap-4 px-4 py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                                >
                                    <div>
                                        <div className="font-medium text-sm">{token.name}</div>
                                        <div className="text-xs text-blue-400 font-mono">{token.ticker}</div>
                                    </div>
                                    <div className="text-right font-mono text-sm">{token.balance}</div>
                                    <div className="text-right font-medium text-sm">{token.value}</div>
                                    <div className={`text-right font-medium text-sm ${
                                        token.pnl.startsWith("+") ? "text-green-400" : "text-red-400"
                                    }`}>
                                        {token.pnl}
                                    </div>
                                    <div className="text-right">
                                        <button className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-primary hover:text-black border border-white/10 hover:border-primary transition-all">
                                            Trade
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Create Wallet Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0f] border border-white/10 max-w-lg w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold">Create Wallet</h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewWalletData(null);
                                    setNewWalletName("");
                                }}
                                className="p-2 hover:bg-white/10 transition-colors"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {newWalletData && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider">Name</label>
                                    <input
                                        type="text"
                                        placeholder="My Wallet"
                                        value={newWalletName}
                                        onChange={(e) => setNewWalletName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider">Public Key</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newWalletData.publicKey}
                                            readOnly
                                            className="flex-1 bg-white/5 border border-white/10 px-4 py-2.5 font-mono text-xs"
                                        />
                                        <button
                                            onClick={() => copyToClipboard(newWalletData.publicKey)}
                                            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                        >
                                            <CopyIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                                        Private Key <span className="text-red-400">- Save this securely</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newWalletData.privateKey}
                                            readOnly
                                            className="flex-1 bg-red-500/10 border border-red-500/20 px-4 py-2.5 font-mono text-xs text-red-300"
                                        />
                                        <button
                                            onClick={() => copyToClipboard(newWalletData.privateKey)}
                                            className={`p-2.5 border transition-colors ${copiedKey ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                        >
                                            {copiedKey ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 text-xs text-yellow-200/80">
                                    Save your private key in a secure location. Anyone with access to your private key can control your wallet.
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setNewWalletData(null);
                                            setNewWalletName("");
                                        }}
                                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveCreatedWallet}
                                        className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black text-sm font-bold transition-all"
                                    >
                                        Save Wallet
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Import Wallet Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0f] border border-white/10 max-w-lg w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold">Import Wallet</h2>
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportPrivateKey("");
                                    setImportWalletName("");
                                }}
                                className="p-2 hover:bg-white/10 transition-colors"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider">Name</label>
                                <input
                                    type="text"
                                    placeholder="My Imported Wallet"
                                    value={importWalletName}
                                    onChange={(e) => setImportWalletName(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider">Private Key (Base58)</label>
                                <input
                                    type="password"
                                    placeholder="Enter your private key..."
                                    value={importPrivateKey}
                                    onChange={(e) => setImportPrivateKey(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2.5 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                                />
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 text-xs text-blue-200/80">
                                Your private key is only used locally to derive your public address. We never store or transmit your private key.
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportPrivateKey("");
                                        setImportWalletName("");
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={importWallet}
                                    disabled={!importPrivateKey}
                                    className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-black text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Import
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Icons
function WalletIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
        </svg>
    );
}

function SolanaIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 128 128" fill="currentColor">
            <path d="M93.94 42.63H22.35c-1.49 0-2.24-1.8-1.18-2.86l14.18-14.18a2.02 2.02 0 011.43-.59h71.59c1.49 0 2.24 1.8 1.18 2.86L95.37 42.04c-.38.38-.9.59-1.43.59zM22.35 85.37h71.59c1.49 0 2.24 1.8 1.18 2.86L80.94 102.41a2.02 2.02 0 01-1.43.59H7.92c-1.49 0-2.24-1.8-1.18-2.86l14.18-14.18c.38-.38.9-.59 1.43-.59zM93.94 63.41H22.35a2.02 2.02 0 00-1.43.59L6.74 78.18c-1.06 1.06-.31 2.86 1.18 2.86h71.59c.54 0 1.05-.21 1.43-.59l14.18-14.18c1.06-1.06.31-2.86-1.18-2.86z" />
        </svg>
    );
}

function CopyIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}
