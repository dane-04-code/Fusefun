/**
 * FUSE.FUN Wallet Manager
 * 
 * Handles wallet connection for Phantom, Solflare, Backpack
 * Uses native wallet APIs (no build step required)
 */

class FuseWalletManager {
    constructor() {
        this.connectedWallet = null;
        this.publicKey = null;
        this.walletType = null;
        this.listeners = new Set();
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.signTransaction = this.signTransaction.bind(this);
        this.signAndSendTransaction = this.signAndSendTransaction.bind(this);
    }

    /**
     * Get available wallet providers
     */
    getAvailableWallets() {
        const wallets = [];
        
        if (window.solana?.isPhantom) {
            wallets.push({
                name: 'Phantom',
                icon: 'https://phantom.app/img/logo.png',
                provider: window.solana,
                type: 'phantom'
            });
        }
        
        if (window.solflare?.isSolflare) {
            wallets.push({
                name: 'Solflare',
                icon: 'https://solflare.com/favicon.ico',
                provider: window.solflare,
                type: 'solflare'
            });
        }
        
        if (window.backpack) {
            wallets.push({
                name: 'Backpack',
                icon: 'https://backpack.app/favicon.ico',
                provider: window.backpack,
                type: 'backpack'
            });
        }

        // Add Coinbase Wallet if available
        if (window.coinbaseSolana) {
            wallets.push({
                name: 'Coinbase Wallet',
                icon: 'https://www.coinbase.com/favicon.ico',
                provider: window.coinbaseSolana,
                type: 'coinbase'
            });
        }

        return wallets;
    }

    /**
     * Connect to a specific wallet
     */
    async connect(walletType = 'phantom') {
        try {
            let provider;
            
            switch (walletType) {
                case 'phantom':
                    if (!window.solana?.isPhantom) {
                        window.open('https://phantom.app/', '_blank');
                        throw new Error('Phantom wallet not installed');
                    }
                    provider = window.solana;
                    break;
                    
                case 'solflare':
                    if (!window.solflare?.isSolflare) {
                        window.open('https://solflare.com/', '_blank');
                        throw new Error('Solflare wallet not installed');
                    }
                    provider = window.solflare;
                    break;
                    
                case 'backpack':
                    if (!window.backpack) {
                        window.open('https://backpack.app/', '_blank');
                        throw new Error('Backpack wallet not installed');
                    }
                    provider = window.backpack;
                    break;
                    
                default:
                    throw new Error('Unknown wallet type');
            }

            // Request connection
            const response = await provider.connect();
            
            this.connectedWallet = provider;
            this.publicKey = response.publicKey.toString();
            this.walletType = walletType;

            // Listen for account changes
            provider.on('accountChanged', (publicKey) => {
                if (publicKey) {
                    this.publicKey = publicKey.toString();
                    this._notifyListeners('accountChanged', this.publicKey);
                } else {
                    this.disconnect();
                }
            });

            // Listen for disconnect
            provider.on('disconnect', () => {
                this.disconnect();
            });

            // Store in localStorage for auto-reconnect
            localStorage.setItem('fuse_wallet_type', walletType);
            
            this._notifyListeners('connect', this.publicKey);
            
            return {
                publicKey: this.publicKey,
                walletType: this.walletType
            };
            
        } catch (error) {
            console.error('Wallet connection failed:', error);
            throw error;
        }
    }

    /**
     * Disconnect wallet
     */
    async disconnect() {
        try {
            if (this.connectedWallet) {
                await this.connectedWallet.disconnect();
            }
        } catch (e) {
            console.log('Disconnect error (ignored):', e);
        }
        
        this.connectedWallet = null;
        this.publicKey = null;
        this.walletType = null;
        
        localStorage.removeItem('fuse_wallet_type');
        
        this._notifyListeners('disconnect', null);
    }

    /**
     * Auto-reconnect if previously connected
     */
    async autoConnect() {
        const savedWalletType = localStorage.getItem('fuse_wallet_type');
        if (savedWalletType) {
            try {
                // Check if wallet is already connected
                const wallets = this.getAvailableWallets();
                const wallet = wallets.find(w => w.type === savedWalletType);
                
                if (wallet && wallet.provider.isConnected) {
                    this.connectedWallet = wallet.provider;
                    this.publicKey = wallet.provider.publicKey?.toString();
                    this.walletType = savedWalletType;
                    
                    if (this.publicKey) {
                        this._notifyListeners('connect', this.publicKey);
                        return true;
                    }
                }
                
                // Try to reconnect
                await this.connect(savedWalletType);
                return true;
            } catch (e) {
                console.log('Auto-connect failed:', e);
                localStorage.removeItem('fuse_wallet_type');
            }
        }
        return false;
    }

    /**
     * Sign a transaction
     */
    async signTransaction(transaction) {
        if (!this.connectedWallet) {
            throw new Error('Wallet not connected');
        }
        
        return await this.connectedWallet.signTransaction(transaction);
    }

    /**
     * Sign and send a transaction
     */
    async signAndSendTransaction(transaction, connection) {
        if (!this.connectedWallet) {
            throw new Error('Wallet not connected');
        }

        // Only set blockhash if not already set (preserves partial signatures)
        if (!transaction.recentBlockhash) {
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
        }
        
        if (!transaction.feePayer) {
            transaction.feePayer = new solanaWeb3.PublicKey(this.publicKey);
        }

        // Sign with wallet (adds signature, preserves existing partial signatures)
        const signed = await this.connectedWallet.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        
        // Confirm transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash,
            lastValidBlockHeight,
            signature
        });

        return signature;
    }

    /**
     * Sign a message (for verification)
     */
    async signMessage(message) {
        if (!this.connectedWallet) {
            throw new Error('Wallet not connected');
        }

        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await this.connectedWallet.signMessage(encodedMessage, 'utf8');
        
        return signedMessage;
    }

    /**
     * Get SOL balance
     */
    async getBalance(connection) {
        if (!this.publicKey) {
            throw new Error('Wallet not connected');
        }

        const balance = await connection.getBalance(new solanaWeb3.PublicKey(this.publicKey));
        return balance / solanaWeb3.LAMPORTS_PER_SOL;
    }

    /**
     * Add event listener
     */
    onStateChange(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners
     */
    _notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data, this);
            } catch (e) {
                console.error('Listener error:', e);
            }
        });
    }

    /**
     * Check if connected
     */
    isConnected() {
        return !!this.publicKey;
    }

    /**
     * Get shortened address for display
     */
    getShortAddress() {
        if (!this.publicKey) return null;
        return `${this.publicKey.slice(0, 4)}...${this.publicKey.slice(-4)}`;
    }
}

// Create global instance
window.fuseWallet = new FuseWalletManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FuseWalletManager;
}
