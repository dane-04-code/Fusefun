/**
 * FUSE.FUN Referral Service
 * 
 * Manages referral codes, tracking, and earnings distribution
 * Referrers earn 10% of fees when:
 * - Users create tokens using their referral code
 * - Users buy tokens with a wallet connected to their code
 */

class FuseReferralService {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:3001';
        this.storageKey = 'fuse_referral';
        this.referralCodeKey = 'fuse_active_referral_code';
        this.FEE_SHARE_PERCENT = 10; // 10% of fees go to referrer
        this.ACTIVE_REFERRAL_TTL_DAYS = Number.isFinite(options.activeReferralTtlDays)
            ? Math.max(1, Math.floor(options.activeReferralTtlDays))
            : 365;
        
        // Initialize referral tracking
        this.init();
    }

    /**
     * Initialize referral service
     * - Check URL for referral code
     * - Load saved referral data
     */
    init() {
        // Check if user arrived via referral link
        this.checkReferralLink();
        
        // Load user's own referral data
        this.loadUserReferralData();
    }

    // ============================================
    // REFERRAL CODE MANAGEMENT
    // ============================================

    /**
     * Generate a unique referral code for a wallet
     */
    generateReferralCode(walletAddress) {
        if (!walletAddress) return null;
        
        // Create a short, memorable code from wallet address
        const hash = this.hashCode(walletAddress + Date.now());
        const code = 'FUSE' + Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
        
        return code;
    }

    /**
     * Create/update user's referral code
     */
    async createReferralCode(walletAddress, customCode = null) {
        if (!walletAddress) {
            throw new Error('Wallet address required');
        }

        const code = customCode || this.generateReferralCode(walletAddress);
        
        try {
            const response = await fetch(`${this.baseUrl}/api/referrals/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: walletAddress,
                    code: code
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create referral code');
            }

            const data = await response.json();
            
            // Save locally
            this.saveUserReferralData({
                wallet: walletAddress,
                code: data.code,
                createdAt: data.createdAt || new Date().toISOString()
            });

            return data;
        } catch (error) {
            console.error('Error creating referral code:', error);
            
            // Fallback to local storage for demo
            const localData = {
                wallet: walletAddress,
                code: code,
                createdAt: new Date().toISOString(),
                referrals: [],
                earnings: { total: 0, pending: 0, claimed: 0 }
            };
            this.saveUserReferralData(localData);
            return localData;
        }
    }

    /**
     * Get user's referral code
     */
    async getReferralCode(walletAddress) {
        try {
            const response = await fetch(`${this.baseUrl}/api/referrals/${walletAddress}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching referral code:', error);
        }

        // Return local data as fallback
        const localData = this.loadUserReferralData();
        return localData?.wallet === walletAddress ? localData : null;
    }

    /**
     * Update referral code (customize it)
     */
    async updateReferralCode(walletAddress, newCode) {
        if (!walletAddress || !newCode) {
            throw new Error('Wallet and code required');
        }

        // Validate code format
        if (!/^[A-Z0-9]{4,12}$/i.test(newCode)) {
            throw new Error('Code must be 4-12 alphanumeric characters');
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/referrals/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet: walletAddress,
                    code: newCode.toUpperCase()
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Code already taken');
            }

            const data = await response.json();
            
            // Update local storage
            const localData = this.loadUserReferralData();
            if (localData) {
                localData.code = data.code;
                this.saveUserReferralData(localData);
            }

            return data;
        } catch (error) {
            console.error('Error updating referral code:', error);
            throw error;
        }
    }

    // ============================================
    // REFERRAL LINK TRACKING
    // ============================================

    /**
     * Check URL for referral code and save it
     */
    checkReferralLink() {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref') || urlParams.get('referral');
        
        if (refCode) {
            this.saveActiveReferralCode(refCode);
            console.log('Referral code captured:', refCode);
            
            // Clean URL (optional)
            // window.history.replaceState({}, '', window.location.pathname);
        }
    }

    /**
     * Get the referral link for sharing
     */
    getReferralLink(code) {
        const baseUrl = window.location.origin;
        return `${baseUrl}?ref=${code}`;
    }

    /**
     * Get referral link with specific page
     */
    getReferralLinkForPage(code, page = 'index.html') {
        const baseUrl = window.location.origin;
        return `${baseUrl}/${page}?ref=${code}`;
    }

    /**
     * Save active referral code (when user arrives via referral)
     */
    saveActiveReferralCode(code) {
        const ttlMs = this.ACTIVE_REFERRAL_TTL_DAYS * 24 * 60 * 60 * 1000;
        const data = {
            code: code.toUpperCase(),
            timestamp: Date.now(),
            expires: Date.now() + ttlMs
        };
        localStorage.setItem(this.referralCodeKey, JSON.stringify(data));
    }

    /**
     * Get active referral code (if user was referred)
     */
    getActiveReferralCode() {
        try {
            const data = JSON.parse(localStorage.getItem(this.referralCodeKey));
            if (data && data.code && data.timestamp) {
                const ttlMs = this.ACTIVE_REFERRAL_TTL_DAYS * 24 * 60 * 60 * 1000;
                const expiresAt = data.timestamp + ttlMs;
                if (expiresAt > Date.now()) {
                    if (data.expires !== expiresAt) {
                        data.expires = expiresAt;
                        localStorage.setItem(this.referralCodeKey, JSON.stringify(data));
                    }
                    return data.code;
                }
            }
            // Expired, remove it
            localStorage.removeItem(this.referralCodeKey);
        } catch (e) {}
        return null;
    }

    /**
     * Clear active referral (after it's used)
     */
    clearActiveReferral() {
        localStorage.removeItem(this.referralCodeKey);
    }

    // ============================================
    // REFERRAL EARNINGS
    // ============================================

    /**
     * Calculate referral earnings from a fee
     * Referrer gets 10% of the trading fee
     */
    calculateReferralEarning(feeAmountLamports) {
        return Math.floor(feeAmountLamports * this.FEE_SHARE_PERCENT / 100);
    }

    /**
     * Record a referral earning (called by trading service)
     */
    async recordReferralEarning(data) {
        const { referralCode, feeAmount, action, mint, userWallet } = data;
        
        if (!referralCode) return null;

        const referralEarning = this.calculateReferralEarning(feeAmount);

        try {
            const response = await fetch(`${this.baseUrl}/api/referrals/earning`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: referralCode,
                    earning: referralEarning,
                    action: action, // 'create', 'buy', 'sell'
                    mint: mint,
                    referredWallet: userWallet,
                    originalFee: feeAmount,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error recording referral earning:', error);
        }

        return { earning: referralEarning, recorded: false };
    }

    /**
     * Get referral earnings for a wallet
     */
    async getEarnings(walletAddress) {
        try {
            const response = await fetch(`${this.baseUrl}/api/referrals/${walletAddress}/earnings`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching earnings:', error);
        }

        // Demo data fallback
        return {
            total: 0,
            pending: 0,
            claimed: 0,
            history: []
        };
    }

    /**
     * Get list of referrals for a wallet
     */
    async getReferrals(walletAddress) {
        try {
            const response = await fetch(`${this.baseUrl}/api/referrals/${walletAddress}/list`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching referrals:', error);
        }

        return [];
    }

    /**
     * Claim referral earnings
     */
    async claimEarnings(walletAddress) {
        if (!walletAddress) {
            throw new Error('Wallet required');
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/referrals/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet: walletAddress })
            });

            if (!response.ok) {
                throw new Error('Failed to claim earnings');
            }

            return await response.json();
        } catch (error) {
            console.error('Error claiming earnings:', error);
            throw error;
        }
    }

    // ============================================
    // REFERRAL REGISTRATION (when wallet connects)
    // ============================================

    /**
     * Register a wallet as being referred
     * Called when a user connects wallet after arriving via referral link
     */
    async registerReferredWallet(walletAddress) {
        const referralCode = this.getActiveReferralCode();
        
        if (!referralCode || !walletAddress) return null;

        try {
            const response = await fetch(`${this.baseUrl}/api/referrals/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: referralCode,
                    wallet: walletAddress
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Wallet registered with referral:', referralCode);
                return data;
            }
        } catch (error) {
            console.error('Error registering referred wallet:', error);
        }

        return null;
    }

    /**
     * Get the referrer for a wallet (if they were referred)
     */
    async getReferrer(walletAddress) {
        try {
            const response = await fetch(`${this.baseUrl}/api/referrals/referrer/${walletAddress}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching referrer:', error);
        }
        return null;
    }

    // ============================================
    // LOCAL STORAGE HELPERS
    // ============================================

    saveUserReferralData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    loadUserReferralData() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey));
        } catch (e) {
            return null;
        }
    }

    // ============================================
    // UTILITY
    // ============================================

    /**
     * Simple hash function for code generation
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    /**
     * Format SOL amount
     */
    formatSol(lamports) {
        return (lamports / 1_000_000_000).toFixed(4);
    }

    /**
     * Copy referral link to clipboard
     */
    async copyReferralLink(code) {
        const link = this.getReferralLink(code);
        try {
            await navigator.clipboard.writeText(link);
            return true;
        } catch (error) {
            console.error('Failed to copy:', error);
            return false;
        }
    }

    /**
     * Share referral link (Web Share API)
     */
    async shareReferralLink(code, tokenName = null) {
        const link = this.getReferralLink(code);
        const title = tokenName 
            ? `Check out ${tokenName} on FUSE.FUN!`
            : 'Join FUSE.FUN - The fairest launchpad on Solana!';
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: `Use my referral code ${code} to earn rewards!`,
                    url: link
                });
                return true;
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Share failed:', error);
                }
            }
        }
        
        // Fallback to copy
        return this.copyReferralLink(code);
    }

    /**
     * Get referral stats summary
     */
    async getStats(walletAddress) {
        const [code, earnings, referrals] = await Promise.all([
            this.getReferralCode(walletAddress),
            this.getEarnings(walletAddress),
            this.getReferrals(walletAddress)
        ]);

        return {
            code: code?.code || null,
            totalReferrals: referrals.length,
            totalEarnings: earnings.total,
            pendingEarnings: earnings.pending,
            claimedEarnings: earnings.claimed,
            referrals: referrals,
            earningsHistory: earnings.history
        };
    }
}

// Create global instance
window.fuseReferralService = new FuseReferralService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FuseReferralService;
}
