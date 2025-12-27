/**
 * FUSE.FUN Token Page Data Loader
 * 
 * Loads token data from URL parameters and API
 * Populates the trading page with real-time data
 */

class FuseTokenLoader {
    constructor() {
        this.params = new URLSearchParams(window.location.search);
        this.tokenData = null;
        this.mint = null;
    }

    /**
     * Initialize and load token data
     */
    async init() {
        this.mint = this.params.get('mint');
        
        if (!this.mint) {
            console.warn('No mint address provided, using demo data');
            this.loadDemoData();
            return;
        }

        // First try to get data from URL params (for tokens from main page)
        this.tokenData = this.getFromURLParams();
        
        // Apply URL param data immediately for fast render
        if (this.tokenData.name) {
            this.applyTokenData(this.tokenData);
        }

        // Then try to fetch full data from API
        try {
            const apiData = await this.fetchFromAPI(this.mint);
            if (apiData) {
                this.tokenData = { ...this.tokenData, ...apiData };
                this.applyTokenData(this.tokenData);
            }
        } catch (e) {
            console.log('API not available, using URL params');
        }

        // Subscribe to real-time updates
        this.subscribeToUpdates();
        
        // Update page title
        document.title = `${this.tokenData.symbol || this.tokenData.name || 'Token'} - FUSE.FUN`;
    }

    /**
     * Get token data from URL parameters
     */
    getFromURLParams() {
        return {
            mint: this.mint,
            name: this.params.get('name') || 'Unknown Token',
            symbol: this.params.get('symbol') || 'TOKEN',
            marketCap: parseFloat(this.params.get('mcap')) || 0,
            progress: parseFloat(this.params.get('progress')) || 0,
            emoji: this.params.get('emoji') || '🪙',
            gradient: this.params.get('gradient') || 'from-blue-500 to-purple-600',
            price: 0,
            volume24h: 0,
            priceChange5m: 0,
            priceChange1h: 0,
            ath: 0
        };
    }

    /**
     * Fetch token data from backend API
     */
    async fetchFromAPI(mint) {
        if (!window.fuseAPI) return null;
        
        try {
            const data = await window.fuseAPI.getToken(mint);
            return {
                name: data.name,
                symbol: data.symbol,
                image: data.image || null,
                uri: data.uri || null,
                description: data.description || '',
                marketCap: data.marketCap || 0,
                price: data.price || 0,
                volume24h: data.volume24h || 0,
                priceChange24h: data.priceChange24h || 0,
                creator: data.creator,
                createdAt: data.createdAt
            };
        } catch (e) {
            console.error('Failed to fetch token from API:', e);
            return null;
        }
    }

    /**
     * Load demo data when no mint is provided
     */
    loadDemoData() {
        this.mint = 'DemoMint111111111111111111111111111111111';
        this.tokenData = {
            mint: this.mint,
            name: 'Skeleton Banging Shield',
            symbol: 'Skeleton',
            marketCap: 10.0,
            progress: 59.0,
            emoji: '🦴',
            gradient: 'from-purple-500 to-pink-500',
            price: 0.00000997,
            volume24h: 47.1,
            priceChange5m: -18.65,
            priceChange1h: 133.58,
            ath: 18.4
        };
        this.applyTokenData(this.tokenData);
    }

    /**
     * Apply token data to the page
     */
    applyTokenData(data) {
        // Token header
        this.setText('#tokenName', data.name);
        this.setText('#tokenTicker', data.symbol);
        this.setText('#switchLabel', data.symbol);
        this.setText('#receiveCurrency', data.symbol);
        
        // Token image
        const tokenImage = document.getElementById('tokenImage');
        const imageSrc = data.image || (typeof data.uri === 'string' && data.uri.startsWith('data:image') ? data.uri : null);
        if (tokenImage && imageSrc) {
            tokenImage.innerHTML = `<img src="${imageSrc}" alt="${(data.symbol || data.name || 'Token')}" class="w-full h-full object-cover" />`;
        } else if (tokenImage && data.emoji) {
            tokenImage.innerHTML = `<span class="text-4xl">${data.emoji}</span>`;
        }
        if (tokenImage && data.gradient) {
            tokenImage.className = `w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${data.gradient} border border-white/10 flex items-center justify-center overflow-hidden`;
        }

        // Token address
        const addressEl = document.getElementById('tokenAddress');
        if (addressEl && this.mint) {
            addressEl.textContent = this.mint.slice(0, 4) + '...' + this.mint.slice(-4);
            addressEl.setAttribute('data-full-address', this.mint);
        }

        // Market stats
        if (data.marketCap !== undefined) {
            this.setText('#marketCap', '$' + this.formatNumber(data.marketCap * 1000));
        }
        if (data.price !== undefined) {
            this.setText('#tokenPrice', '$' + data.price.toFixed(8));
        }
        if (data.volume24h !== undefined) {
            this.setText('#volume24h', '$' + this.formatNumber(data.volume24h * 1000));
        }
        if (data.ath !== undefined) {
            this.setText('#athPrice', '$' + this.formatNumber(data.ath * 1000));
        }
        if (data.priceChange5m !== undefined) {
            const el = document.getElementById('priceChange5m');
            if (el) {
                el.textContent = (data.priceChange5m >= 0 ? '+' : '') + data.priceChange5m.toFixed(2) + '% (5m)';
                el.className = 'text-xs mt-1 ' + (data.priceChange5m >= 0 ? 'text-green-400' : 'text-red-400');
            }
        }

        // Bonding curve progress
        if (data.progress !== undefined) {
            this.setText('#curvePercent', data.progress.toFixed(1) + '%');
            const progressBar = document.getElementById('curveProgress');
            if (progressBar) {
                progressBar.style.width = data.progress + '%';
            }
            
            // Calculate SOL in curve (approximate)
            const solInCurve = (data.progress / 100 * 85).toFixed(3);
            this.setText('#curveSOL', solInCurve + ' SOL in bonding curve');
            
            // Calculate remaining to graduate
            const remaining = Math.max(0, 85 - solInCurve);
            this.setText('#curveTarget', '$' + this.formatNumber(remaining * 180) + ' to graduate');
        }

        // Token chat section
        const chatName = document.querySelector('.font-semibold.text-sm');
        if (chatName && data.symbol) {
            chatName.textContent = data.symbol + ' chat';
        }
    }

    /**
     * Subscribe to real-time trade updates
     */
    subscribeToUpdates() {
        if (!window.fuseAPI || !this.mint) return;

        window.fuseAPI.subscribe(this.mint, (trade) => {
            // Update price
            const newPrice = trade.solAmount / trade.tokenAmount;
            this.setText('#tokenPrice', '$' + newPrice.toFixed(8));
            
            // Flash price change indicator
            const priceEl = document.getElementById('tokenPrice');
            if (priceEl) {
                priceEl.classList.add(trade.type === 'buy' ? 'text-green-400' : 'text-red-400');
                setTimeout(() => {
                    priceEl.classList.remove('text-green-400', 'text-red-400');
                }, 500);
            }
        });
    }

    /**
     * Helper: Set text content of an element
     */
    setText(selector, text) {
        const el = document.querySelector(selector);
        if (el) el.textContent = text;
    }

    /**
     * Helper: Format large numbers
     */
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toFixed(2);
    }

    /**
     * Get current mint address
     */
    getMint() {
        return this.mint;
    }

    /**
     * Get current token data
     */
    getTokenData() {
        return this.tokenData;
    }
}

// Create global instance
window.fuseTokenLoader = new FuseTokenLoader();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.fuseTokenLoader.init();
});

// Also export copyAddress function for the page
window.copyTokenAddress = function() {
    const addressEl = document.getElementById('tokenAddress');
    const fullAddress = addressEl?.getAttribute('data-full-address') || window.fuseTokenLoader?.getMint() || '';
    
    if (fullAddress) {
        navigator.clipboard.writeText(fullAddress).then(() => {
            if (window.fuseWalletUI) {
                window.fuseWalletUI.showToast('Address copied!', 'success');
            }
        });
    }
};
