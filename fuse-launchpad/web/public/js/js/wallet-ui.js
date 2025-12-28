/**
 * FUSE.FUN Wallet UI Component
 * 
 * Handles wallet modal UI and integration with wallet-manager.js
 */

class FuseWalletUI {
    constructor() {
        this.modalId = 'fuse-wallet-modal';
        this.isOpen = false;
        this.init();
    }

    /**
     * Initialize the wallet UI
     */
    init() {
        // Create modal HTML
        this.createModal();
        
        // Listen for wallet state changes
        if (window.fuseWallet) {
            window.fuseWallet.onStateChange((state) => {
                this.updateUI(state);
            });
            
            // Auto-connect if previously connected
            window.fuseWallet.autoConnect();
        }

        // Update UI with initial state
        this.updateConnectButtons();
    }

    /**
     * Create the wallet modal HTML
     */
    createModal() {
        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'fixed inset-0 z-50 hidden';
        modal.innerHTML = `
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="fuseWalletUI.close()"></div>
            
            <!-- Modal Content -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
                <div class="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl">
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-bold text-white">Connect Wallet</h2>
                        <button onclick="fuseWalletUI.close()" class="text-zinc-400 hover:text-white transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Wallet Options -->
                    <div id="wallet-options" class="space-y-3">
                        <!-- Phantom -->
                        <button onclick="fuseWalletUI.connectWallet('phantom')" 
                                class="wallet-option w-full flex items-center gap-4 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all border border-transparent hover:border-[#00FFA3]"
                                data-wallet="phantom">
                            <img src="https://phantom.app/img/logo.png" alt="Phantom" class="w-10 h-10 rounded-lg">
                            <div class="text-left flex-1">
                                <span class="text-white font-semibold">Phantom</span>
                                <p class="text-zinc-400 text-sm">Most popular Solana wallet</p>
                            </div>
                            <span class="wallet-status text-sm text-zinc-500">Detecting...</span>
                        </button>
                        
                        <!-- Solflare -->
                        <button onclick="fuseWalletUI.connectWallet('solflare')" 
                                class="wallet-option w-full flex items-center gap-4 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all border border-transparent hover:border-[#00FFA3]"
                                data-wallet="solflare">
                            <img src="https://solflare.com/favicon.ico" alt="Solflare" class="w-10 h-10 rounded-lg bg-white p-1">
                            <div class="text-left flex-1">
                                <span class="text-white font-semibold">Solflare</span>
                                <p class="text-zinc-400 text-sm">Secure Solana wallet</p>
                            </div>
                            <span class="wallet-status text-sm text-zinc-500">Detecting...</span>
                        </button>
                        
                        <!-- Backpack -->
                        <button onclick="fuseWalletUI.connectWallet('backpack')" 
                                class="wallet-option w-full flex items-center gap-4 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all border border-transparent hover:border-[#00FFA3]"
                                data-wallet="backpack">
                            <img src="https://backpack.app/favicon.ico" alt="Backpack" class="w-10 h-10 rounded-lg">
                            <div class="text-left flex-1">
                                <span class="text-white font-semibold">Backpack</span>
                                <p class="text-zinc-400 text-sm">xNFT-enabled wallet</p>
                            </div>
                            <span class="wallet-status text-sm text-zinc-500">Detecting...</span>
                        </button>
                        
                        <!-- Coinbase Wallet -->
                        <button onclick="fuseWalletUI.connectWallet('coinbase')" 
                                class="wallet-option w-full flex items-center gap-4 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all border border-transparent hover:border-[#00FFA3]"
                                data-wallet="coinbase">
                            <img src="https://www.coinbase.com/favicon.ico" alt="Coinbase" class="w-10 h-10 rounded-lg bg-blue-600 p-1">
                            <div class="text-left flex-1">
                                <span class="text-white font-semibold">Coinbase Wallet</span>
                                <p class="text-zinc-400 text-sm">Easy-to-use crypto wallet</p>
                            </div>
                            <span class="wallet-status text-sm text-zinc-500">Detecting...</span>
                        </button>
                    </div>
                    
                    <!-- Footer -->
                    <div class="mt-6 pt-4 border-t border-zinc-800">
                        <p class="text-zinc-500 text-sm text-center">
                            By connecting, you agree to our 
                            <a href="#" class="text-[#00FFA3] hover:underline">Terms of Service</a>
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Loading State -->
            <div id="wallet-connecting" class="hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div class="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 shadow-2xl text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-4 border-[#00FFA3] border-t-transparent mx-auto mb-4"></div>
                    <p class="text-white font-semibold">Connecting...</p>
                    <p class="text-zinc-400 text-sm mt-2">Please approve in your wallet</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Check available wallets after a short delay
        setTimeout(() => this.checkAvailableWallets(), 500);
    }

    /**
     * Check which wallets are available
     */
    checkAvailableWallets() {
        const wallets = window.fuseWallet?.getAvailableWallets() || {};
        
        const walletOptions = document.querySelectorAll('.wallet-option');
        walletOptions.forEach(option => {
            const walletType = option.dataset.wallet;
            const statusEl = option.querySelector('.wallet-status');
            
            if (wallets[walletType]) {
                statusEl.textContent = 'Detected';
                statusEl.classList.remove('text-zinc-500');
                statusEl.classList.add('text-[#00FFA3]');
                option.classList.remove('opacity-50');
            } else {
                statusEl.textContent = 'Not installed';
                statusEl.classList.remove('text-[#00FFA3]');
                statusEl.classList.add('text-zinc-500');
                option.classList.add('opacity-50');
            }
        });
    }

    /**
     * Open the wallet modal
     */
    open() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.remove('hidden');
            this.isOpen = true;
            document.body.style.overflow = 'hidden';
            this.checkAvailableWallets();
        }
    }

    /**
     * Close the wallet modal
     */
    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.add('hidden');
            this.isOpen = false;
            document.body.style.overflow = '';
            
            // Reset loading state
            document.getElementById('wallet-options')?.classList.remove('hidden');
            document.getElementById('wallet-connecting')?.classList.add('hidden');
        }
    }

    /**
     * Connect to a specific wallet
     */
    async connectWallet(walletType) {
        const wallets = window.fuseWallet?.getAvailableWallets() || {};
        
        if (!wallets[walletType]) {
            // Wallet not installed - open install page
            const installUrls = {
                phantom: 'https://phantom.app/',
                solflare: 'https://solflare.com/',
                backpack: 'https://backpack.app/',
                coinbase: 'https://www.coinbase.com/wallet'
            };
            window.open(installUrls[walletType], '_blank');
            return;
        }
        
        // Show loading state
        document.getElementById('wallet-options')?.classList.add('hidden');
        document.getElementById('wallet-connecting')?.classList.remove('hidden');
        
        try {
            await window.fuseWallet.connect(walletType);
            this.close();
            this.showToast('Wallet connected successfully!', 'success');
        } catch (error) {
            console.error('Connection failed:', error);
            this.showToast('Failed to connect wallet: ' + error.message, 'error');
            
            // Reset modal state
            document.getElementById('wallet-options')?.classList.remove('hidden');
            document.getElementById('wallet-connecting')?.classList.add('hidden');
        }
    }

    /**
     * Disconnect wallet
     */
    async disconnect() {
        if (window.fuseWallet) {
            await window.fuseWallet.disconnect();
            this.showToast('Wallet disconnected', 'info');
        }
    }

    /**
     * Update UI based on wallet state
     */
    updateUI(state) {
        this.updateConnectButtons();
        this.updateTradingPanel(state);
    }

    /**
     * Update all connect wallet buttons
     */
    updateConnectButtons() {
        const isConnected = window.fuseWallet?.isConnected() || false;
        const address = window.fuseWallet?.getShortAddress() || '';
        
        // Update header connect buttons
        document.querySelectorAll('.connect-wallet-btn').forEach(btn => {
            if (isConnected) {
                btn.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 bg-[#00FFA3] rounded-full"></span>
                        <span>${address}</span>
                    </div>
                `;
                btn.onclick = () => this.showWalletMenu(btn);
            } else {
                btn.innerHTML = 'Connect Wallet';
                btn.onclick = () => this.open();
            }
        });

        // Update Create Coin buttons
        document.querySelectorAll('.create-coin-btn').forEach(btn => {
            if (!isConnected) {
                btn.onclick = () => this.open();
            }
        });
    }

    /**
     * Update trading panel based on connection state
     */
    updateTradingPanel(state) {
        const tradeButton = document.querySelector('.trade-action-btn');
        const loginPrompt = document.querySelector('.login-prompt');
        const tradeForm = document.querySelector('.trade-form');
        
        if (state?.connected) {
            // Show trade form, hide login prompt
            if (loginPrompt) loginPrompt.classList.add('hidden');
            if (tradeForm) tradeForm.classList.remove('hidden');
            if (tradeButton) {
                tradeButton.disabled = false;
                tradeButton.textContent = 'Place Trade';
            }
            
            // Update balance display
            this.updateBalanceDisplay();
        } else {
            // Show login prompt, hide trade form
            if (loginPrompt) loginPrompt.classList.remove('hidden');
            if (tradeForm) tradeForm.classList.add('hidden');
        }
    }

    /**
     * Update balance display in trading panel
     */
    async updateBalanceDisplay() {
        if (!window.fuseWallet?.isConnected()) return;
        
        try {
            const balance = await window.fuseWallet.getBalance();
            const balanceEl = document.querySelector('.sol-balance');
            if (balanceEl) {
                balanceEl.textContent = `${balance.toFixed(4)} SOL`;
            }
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        }
    }

    /**
     * Show wallet dropdown menu
     */
    showWalletMenu(button) {
        // Remove existing menu
        const existingMenu = document.getElementById('wallet-dropdown');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement('div');
        menu.id = 'wallet-dropdown';
        menu.className = 'absolute mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50';
        menu.innerHTML = `
            <div class="p-2">
                <button onclick="navigator.clipboard.writeText('${window.fuseWallet?.publicKey || ''}'); fuseWalletUI.showToast('Address copied!', 'success'); document.getElementById('wallet-dropdown').remove();"
                        class="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    Copy Address
                </button>
                <a href="https://solscan.io/account/${window.fuseWallet?.publicKey || ''}" target="_blank"
                   class="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                    View on Solscan
                </a>
                <hr class="my-2 border-zinc-700">
                <button onclick="fuseWalletUI.disconnect(); document.getElementById('wallet-dropdown').remove();"
                        class="w-full text-left px-4 py-2 text-red-400 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    Disconnect
                </button>
            </div>
        `;
        
        // Position the menu
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 8}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
        
        document.body.appendChild(menu);
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target !== button) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const colors = {
            success: 'bg-[#00FFA3] text-black',
            error: 'bg-red-500 text-white',
            info: 'bg-blue-500 text-white',
            warning: 'bg-yellow-500 text-black'
        };

        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl ${colors[type]} font-medium shadow-lg z-50 animate-slide-up`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-up {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .animate-slide-up {
        animation: slide-up 0.3s ease-out;
    }
`;
document.head.appendChild(style);

// Create global instance when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.fuseWalletUI = new FuseWalletUI();
    });
} else {
    window.fuseWalletUI = new FuseWalletUI();
}
