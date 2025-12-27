/**
 * FUSE.FUN API Client
 * 
 * Frontend client for the backend API and WebSocket connection
 * Handles data fetching and real-time updates
 */

class FuseAPIClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:3001';
        this.wsUrl = options.wsUrl || 'ws://localhost:3001';
        this.ws = null;
        this.subscriptions = new Map(); // mint -> callbacks[]
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.listeners = new Map(); // event -> callbacks[]
    }

    // ============================================
    // HTTP API METHODS
    // ============================================

    /**
     * Fetch with error handling
     */
    async fetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Get all tokens
     */
    async getTokens() {
        return this.fetch('/api/tokens');
    }

    /**
     * Get token details
     */
    async getToken(mint) {
        return this.fetch(`/api/tokens/${mint}`);
    }

    /**
     * Get trades for a token
     */
    async getTrades(mint, limit = 50, offset = 0) {
        return this.fetch(`/api/tokens/${mint}/trades?limit=${limit}&offset=${offset}`);
    }

    /**
     * Get chart data
     */
    async getChartData(mint, interval = '1m', from = null, to = null) {
        let url = `/api/tokens/${mint}/chart?interval=${interval}`;
        if (from) url += `&from=${from}`;
        if (to) url += `&to=${to}`;
        return this.fetch(url);
    }

    /**
     * Get token stats
     */
    async getStats(mint) {
        return this.fetch(`/api/tokens/${mint}/stats`);
    }

    /**
     * Get King of the Hill
     */
    async getKing() {
        return this.fetch('/api/king');
    }

    /**
     * Get trending tokens
     */
    async getTrending(limit = 10) {
        return this.fetch(`/api/trending?limit=${limit}`);
    }

    /**
     * Register a new token
     */
    async registerToken(tokenData) {
        return this.fetch('/api/tokens', {
            method: 'POST',
            body: JSON.stringify(tokenData)
        });
    }

    // ============================================
    // WEBSOCKET METHODS
    // ============================================

    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.wsUrl);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.reconnectAttempts = 0;
                    
                    // Resubscribe to all previous subscriptions
                    for (const mint of this.subscriptions.keys()) {
                        this.ws.send(JSON.stringify({ type: 'subscribe', mint }));
                    }
                    
                    // Start ping interval
                    this.startPing();
                    
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (e) {
                        console.error('Failed to parse WebSocket message:', e);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.stopPing();
                    this.attemptReconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        this.stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
    }

    /**
     * Subscribe to token updates
     */
    subscribe(mint, callback) {
        if (!this.subscriptions.has(mint)) {
            this.subscriptions.set(mint, []);
            
            // Send subscribe message if connected
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'subscribe', mint }));
            }
        }
        
        this.subscriptions.get(mint).push(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.subscriptions.get(mint);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
                
                // Unsubscribe if no more callbacks
                if (callbacks.length === 0) {
                    this.subscriptions.delete(mint);
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({ type: 'unsubscribe', mint }));
                    }
                }
            }
        };
    }

    /**
     * Handle incoming WebSocket message
     */
    handleMessage(message) {
        switch (message.type) {
            case 'trade':
                this.handleTradeUpdate(message.data);
                break;
            case 'tokenCreated':
                this.emit('tokenCreated', message);
                break;
            case 'graduated':
                this.emit('graduated', message);
                break;
            case 'subscribed':
                console.log(`Subscribed to ${message.mint}`);
                break;
            case 'unsubscribed':
                console.log(`Unsubscribed from ${message.mint}`);
                break;
            case 'pong':
                // Keep-alive response
                break;
        }
    }

    /**
     * Handle trade update
     */
    handleTradeUpdate(trade) {
        const callbacks = this.subscriptions.get(trade.mint);
        if (callbacks) {
            callbacks.forEach(cb => cb(trade));
        }
        
        // Emit global trade event
        this.emit('trade', trade);
    }

    /**
     * Attempt to reconnect
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect().catch(console.error);
        }, delay);
    }

    /**
     * Start ping interval
     */
    startPing() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }

    /**
     * Stop ping interval
     */
    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    // ============================================
    // EVENT EMITTER
    // ============================================

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        
        return () => this.off(event, callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
    }
}

// Create global instance
window.fuseAPI = new FuseAPIClient();

// Auto-connect WebSocket when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.fuseAPI.connect().catch(console.error);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FuseAPIClient;
}
