# FUSE.FUN Wallet & Backend Integration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FUSE.FUN Frontend                        │
├─────────────────────────────────────────────────────────────────┤
│  wallet-manager.js   │  wallet-ui.js    │  trading-service.js   │
│  (Phantom/Solflare/  │  (Modal UI,      │  (Build & sign txs,   │
│   Backpack connect)  │   Toast notifs)  │   bonding curve math) │
├─────────────────────────────────────────────────────────────────┤
│  api-client.js       │  chart-integration.js                    │
│  (REST + WebSocket)  │  (Real-time chart updates)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FUSE.FUN Backend API                        │
├─────────────────────────────────────────────────────────────────┤
│  Express.js REST API    │    WebSocket Server                   │
│  - GET /api/tokens      │    - Real-time trade updates          │
│  - GET /api/tokens/:id  │    - Subscribe/unsubscribe            │
│  - GET /api/chart       │    - Ping/pong keepalive              │
│  - GET /api/king        │                                       │
│  - POST /api/tokens     │                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ RPC / Log Subscription
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Solana Blockchain                          │
├─────────────────────────────────────────────────────────────────┤
│  FUSE Program (Anchor)                                          │
│  - create_token  │  buy  │  sell  │  migrate                    │
│  - Bonding Curve State  │  Token Vaults                         │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Components

### 1. Wallet Manager (`web/js/wallet-manager.js`)

Handles wallet connection for multiple providers:

```javascript
// Available methods
window.fuseWallet.getAvailableWallets()  // {phantom: true, solflare: false, ...}
window.fuseWallet.connect('phantom')      // Connect to specific wallet
window.fuseWallet.disconnect()            // Disconnect current wallet
window.fuseWallet.isConnected()           // Check connection status
window.fuseWallet.getShortAddress()       // "Fg6P...nS"
window.fuseWallet.signTransaction(tx)     // Sign a transaction
window.fuseWallet.signAndSendTransaction(tx, connection)  // Sign & submit
window.fuseWallet.getBalance()            // Get SOL balance
window.fuseWallet.onStateChange(callback) // Listen for state changes
```

### 2. Wallet UI (`web/js/wallet-ui.js`)

Provides modal UI and toast notifications:

```javascript
window.fuseWalletUI.open()                // Open wallet select modal
window.fuseWalletUI.close()               // Close modal
window.fuseWalletUI.showToast(msg, type)  // Show notification
```

### 3. Trading Service (`web/js/trading-service.js`)

Handles trade execution via bonding curve:

```javascript
const service = window.fuseTradingService;

// Calculate trade quotes
service.calculateBuyAmount(curveState, solLamports)
service.calculateSellAmount(curveState, tokenAmount)
service.getCurrentPrice(curveState)
service.getMarketCap(curveState)

// Execute trades (requires connected wallet)
await service.executeBuy(mint, solAmount, slippagePercent)
await service.executeSell(mint, tokenAmount, slippagePercent)
```

### 4. API Client (`web/js/api-client.js`)

REST and WebSocket client for backend:

```javascript
const api = window.fuseAPI;

// REST API
await api.getTokens()              // List all tokens
await api.getToken(mint)           // Token details
await api.getTrades(mint, limit)   // Recent trades
await api.getChartData(mint)       // OHLCV candles
await api.getKing()                // King of the Hill
await api.getTrending(10)          // Trending tokens

// WebSocket
await api.connect()                // Connect to WS
api.subscribe(mint, callback)      // Subscribe to trade updates
api.disconnect()                   // Disconnect
```

### 5. Chart Integration (`web/js/chart-integration.js`)

Real-time chart updates with TradingView Lightweight Charts:

```javascript
const chart = new FuseChartManager('container-id');
chart.init();
chart.loadToken(mint);             // Load token chart data
chart.setInterval('5m');           // Change interval
chart.destroy();                   // Cleanup
```

## Backend API

### Installation

```bash
cd backend
npm install
npm run dev   # Development with nodemon
npm start     # Production
```

### Environment Variables

```bash
PORT=3001
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tokens` | List all indexed tokens with stats |
| GET | `/api/tokens/:mint` | Get token details |
| GET | `/api/tokens/:mint/trades` | Get recent trades |
| GET | `/api/tokens/:mint/chart` | Get OHLCV chart data |
| GET | `/api/tokens/:mint/stats` | Get aggregated stats |
| POST | `/api/tokens` | Register new token |
| GET | `/api/king` | Get King of the Hill |
| GET | `/api/trending` | Get trending tokens |

### WebSocket Events

```javascript
// Client -> Server
{ type: 'subscribe', mint: 'ABC...' }
{ type: 'unsubscribe', mint: 'ABC...' }
{ type: 'ping' }

// Server -> Client
{ type: 'trade', data: { type, mint, user, solAmount, tokenAmount, timestamp } }
{ type: 'subscribed', mint: 'ABC...' }
{ type: 'pong' }
```

## Integration Guide

### Adding Wallet Connection to a Page

1. Include the scripts in `<head>`:

```html
<script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
<script src="js/wallet-manager.js" defer></script>
<script src="js/wallet-ui.js" defer></script>
```

2. Add a connect button:

```html
<button onclick="fuseWalletUI.open()" class="connect-wallet-btn">
    Connect Wallet
</button>
```

3. Listen for connection state:

```javascript
window.fuseWallet.onStateChange((state) => {
    if (state.connected) {
        console.log('Connected:', state.publicKey);
    }
});
```

### Executing Trades

```javascript
// Check connection first
if (!window.fuseWallet.isConnected()) {
    window.fuseWalletUI.open();
    return;
}

try {
    // Buy 0.5 SOL worth of tokens with 1% slippage
    const result = await window.fuseTradingService.executeBuy(
        'TOKEN_MINT_ADDRESS',
        0.5,  // SOL amount
        1     // slippage %
    );
    
    console.log('Transaction:', result.signature);
    console.log('Tokens received:', result.tokensReceived);
} catch (error) {
    console.error('Trade failed:', error);
}
```

### Subscribing to Real-time Updates

```javascript
// Subscribe to a token's trades
const unsubscribe = window.fuseAPI.subscribe(mint, (trade) => {
    console.log('New trade:', trade);
    // Update UI with new trade
});

// Later: unsubscribe when done
unsubscribe();
```

## Supported Wallets

| Wallet | Detection | Status |
|--------|-----------|--------|
| Phantom | `window.solana?.isPhantom` | ✅ Full support |
| Solflare | `window.solflare?.isSolflare` | ✅ Full support |
| Backpack | `window.backpack` | ✅ Full support |
| Coinbase | `window.coinbaseSolana` | ✅ Full support |

## Production Considerations

1. **Database**: Replace in-memory stores with PostgreSQL/MongoDB
2. **Indexer**: Use dedicated Solana indexer (Helius, Shyft, etc.)
3. **RPC**: Use dedicated RPC provider (Helius, QuickNode, etc.)
4. **Caching**: Add Redis for chart data and frequent queries
5. **CDN**: Serve static assets from CDN
6. **SSL**: Use HTTPS in production
7. **Rate Limiting**: Add rate limiting to API endpoints
8. **Error Tracking**: Add Sentry or similar for error monitoring
