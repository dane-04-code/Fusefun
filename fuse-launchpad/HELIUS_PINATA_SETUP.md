# Helius & Pinata Integration Setup Guide

## Overview

Your FUSE.FUN launchpad now has complete integration with:
- **Helius**: Real-time transaction indexing via webhooks + high-performance RPC
- **Pinata**: Decentralized IPFS storage for token images and metadata

---

## 🔧 Backend Configuration

### Required Environment Variables

Add these to your `.env` file or set them in your environment:

```bash
# Helius Configuration
HELIUS_API_KEY=your-helius-api-key-here
HELIUS_WEBHOOK_SECRET=your-webhook-secret-here
SOLANA_NETWORK=devnet  # or mainnet

# Pinata Configuration
PINATA_API_KEY=your-pinata-jwt-token-here
PINATA_SECRET_KEY=your-pinata-secret-key-here
```

### Get Your API Keys

#### Helius
1. Go to https://dev.helius.xyz/
2. Sign up / Log in
3. Create a new API key
4. Copy the API key to `HELIUS_API_KEY`

#### Pinata
1. Go to https://pinata.cloud/
2. Sign up / Log in
3. Navigate to **API Keys** → **New Key**
4. Select permissions: `pinFileToIPFS`, `pinJSONToIPFS`
5. Copy the JWT token to `PINATA_API_KEY`
6. Copy the secret key to `PINATA_SECRET_KEY`

---

## 📡 Helius Webhook Setup

### Configure Webhook in Helius Dashboard

1. Log in to https://dev.helius.xyz/
2. Navigate to **Webhooks** section
3. Click **Create Webhook**
4. Configure:
   - **Webhook URL**: `https://your-domain.com/api/helius/webhook`
   - **Webhook Type**: Enhanced Transactions
   - **Account Address**: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS` (your program ID)
   - **Transaction Types**: All
5. Copy the **Webhook Secret** to your `HELIUS_WEBHOOK_SECRET` env var

### Test Webhook Locally (Optional)

Use ngrok or similar tool to expose your local server:

```powershell
# Install ngrok
choco install ngrok

# Expose port 3001
ngrok http 3001

# Use the ngrok URL in Helius dashboard:
# https://your-ngrok-id.ngrok.io/api/helius/webhook
```

---

## 🌐 Frontend Configuration

### Set Helius RPC (Optional)

For better RPC performance, you can set the API key in your frontend:

**Option 1: Global Configuration**

Add to your HTML before loading scripts:

```html
<script>
    // Optional: Use Helius RPC for better performance
    window.HELIUS_API_KEY = 'your-helius-api-key';
</script>
<script src="/js/trading-service.js"></script>
<script src="/js/token-creation-service.js"></script>
```

**Option 2: Environment Variable**

The frontend will automatically use Helius RPC if the backend is configured.

---

## 📦 Backend Endpoints

### Helius Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/helius/webhook` | POST | Receives real-time transaction events from Helius |
| `/api/helius/status` | GET | Check Helius integration status |
| `/api/helius/test-webhook` | POST | Test webhook processing (dev only) |

### Pinata Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pinata/upload-image` | POST | Upload token image to IPFS |
| `/api/pinata/upload-metadata` | POST | Upload token metadata JSON to IPFS |
| `/api/pinata/status` | GET | Check Pinata integration status |

---

## 🔄 How It Works

### Token Creation Flow (with Pinata)

1. User fills out token creation form
2. User selects an image file
3. Frontend uploads image to backend `/api/pinata/upload-image`
4. Backend pins image to IPFS via Pinata
5. Backend returns IPFS URL (e.g., `https://gateway.pinata.cloud/ipfs/Qm...`)
6. Frontend creates metadata JSON with image URL
7. Frontend uploads metadata to `/api/pinata/upload-metadata`
8. Backend pins metadata to IPFS
9. Backend returns metadata IPFS URL
10. Frontend creates token on-chain with metadata URI
11. Token is now live with decentralized image/metadata storage!

### Real-Time Updates Flow (with Helius)

1. User buys/sells/creates token on-chain
2. Helius detects the transaction and parses it
3. Helius sends webhook to your backend `/api/helius/webhook`
4. Backend verifies HMAC signature for security
5. Backend parses instruction discriminator (buy/sell/create/migrate)
6. Backend processes event and updates database
7. Backend broadcasts event to connected WebSocket clients
8. Frontend receives real-time update and refreshes UI

---

## 🧪 Testing

### Test Pinata Integration

```powershell
# Start your backend server
cd backend
npm start

# In another terminal, test image upload
curl -X POST http://localhost:3001/api/pinata/upload-image `
  -F "file=@path/to/your/image.png"

# Test metadata upload
curl -X POST http://localhost:3001/api/pinata/upload-metadata `
  -H "Content-Type: application/json" `
  -d '{"name":"Test Token","symbol":"TEST","description":"Test description","imageUrl":"https://gateway.pinata.cloud/ipfs/Qm..."}'
```

### Test Helius Webhook

```powershell
# Check Helius status
curl http://localhost:3001/api/helius/status

# Send test webhook (dev only)
curl -X POST http://localhost:3001/api/helius/test-webhook `
  -H "Content-Type: application/json" `
  -d '{}'
```

---

## 🚀 Deployment Checklist

### Backend Deployment

- [ ] Set environment variables on your hosting platform
- [ ] Update `HELIUS_WEBHOOK_SECRET` with production value
- [ ] Configure webhook URL in Helius dashboard
- [ ] Ensure backend is accessible via HTTPS (required for webhooks)
- [ ] Test webhook delivery with a test transaction

### Frontend Deployment

- [ ] (Optional) Configure `window.HELIUS_API_KEY` for Helius RPC
- [ ] Ensure CORS is configured correctly on backend
- [ ] Test token creation with image upload
- [ ] Verify IPFS URLs are loading correctly

---

## 📊 Monitoring

### Backend Logs

The backend will log:

```
[Helius] Initialized successfully
[Helius] RPC: https://devnet.helius-rpc.com/?api-key=***
[Pinata] Initialized successfully
[Helius] Webhook received: 1 transactions
[Helius] Processing transaction: abc123...
[Helius] Event: buy, mint: xyz789...
[Pinata] Uploading image: token.png (1234 bytes)
[Pinata] Image uploaded successfully: QmABC123...
```

### Check Integration Status

```javascript
// Check Helius
fetch('http://localhost:3001/api/helius/status')
  .then(r => r.json())
  .then(console.log);
// { configured: true, webhookConfigured: true, rpcUrl: "..." }

// Check Pinata
fetch('http://localhost:3001/api/pinata/status')
  .then(r => r.json())
  .then(console.log);
// { configured: true, ready: true, gateway: "gateway.pinata.cloud" }
```

---

## ⚠️ Important Notes

### Helius Webhook Security

- The webhook endpoint verifies HMAC-SHA256 signatures
- Never expose your `HELIUS_WEBHOOK_SECRET`
- Webhook requests without valid signatures are rejected

### Pinata Quotas

- Free tier: 1 GB storage, 100k files
- Check your usage at https://app.pinata.cloud/
- Upgrade if you exceed limits

### IPFS Gateway

- Default gateway: `gateway.pinata.cloud`
- You can use custom gateways if needed
- IPFS URLs are permanent and immutable

### Fallback Behavior

- If Pinata fails, frontend falls back to backend metadata endpoint
- If Helius RPC is not configured, uses public Solana RPC
- Both services degrade gracefully

---

## 🐛 Troubleshooting

### Helius Webhook Not Receiving Events

1. Check webhook URL is publicly accessible (use ngrok for local testing)
2. Verify `HELIUS_WEBHOOK_SECRET` matches Helius dashboard
3. Check backend logs for signature verification errors
4. Ensure program ID is correct: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

### Pinata Upload Fails

1. Verify `PINATA_API_KEY` is the JWT token (starts with `eyJ...`)
2. Check file size (max 5MB per file)
3. Ensure backend has `multer` and `pinata` packages installed
4. Check Pinata dashboard for quota limits

### Image Not Displaying

1. Verify IPFS URL is correct (`https://gateway.pinata.cloud/ipfs/Qm...`)
2. Check CORS headers if loading from different domain
3. Try accessing IPFS URL directly in browser
4. Allow 1-2 minutes for IPFS propagation

---

## 📚 Resources

- **Helius Docs**: https://docs.helius.dev/
- **Pinata Docs**: https://docs.pinata.cloud/
- **IPFS Docs**: https://docs.ipfs.tech/
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/

---

## ✅ Integration Complete

Your FUSE.FUN launchpad now has:

✅ Real-time transaction indexing with Helius webhooks  
✅ High-performance Helius RPC for faster transactions  
✅ Decentralized image storage on IPFS via Pinata  
✅ Permanent, immutable token metadata  
✅ WebSocket broadcasting for live updates  
✅ Secure webhook verification  
✅ Graceful fallback mechanisms  

Ready to launch! 🚀
