/**
 * FUSE.FUN Backend API Server
 * 
 * Node.js/Express backend for:
 * - Indexing trades from blockchain
 * - Serving chart data (OHLCV)
 * - Token metadata and stats
 * - Real-time WebSocket updates
 * - Bonding curve price calculations
 * - Helius webhook integration for real-time indexing
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const crypto = require('crypto');
const multer = require('multer');
const { PinataSDK } = require('pinata');
const { Connection, PublicKey } = require('@solana/web3.js');

const { initDb, run: dbRun, get: dbGet, all: dbAll } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Helius webhooks can be large

// ============================================
// HELIUS CONFIGURATION
// ============================================
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET || '';

// Use Helius RPC if API key is provided, otherwise fall back to public RPC
const HELIUS_RPC_URL = HELIUS_API_KEY 
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : null;
const HELIUS_DEVNET_RPC_URL = HELIUS_API_KEY
    ? `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    : null;

// Determine which RPC to use
const NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const getRpcUrl = () => {
    if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
    if (NETWORK === 'mainnet' && HELIUS_RPC_URL) return HELIUS_RPC_URL;
    if (NETWORK === 'devnet' && HELIUS_DEVNET_RPC_URL) return HELIUS_DEVNET_RPC_URL;
    return NETWORK === 'mainnet' 
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';
};

// Solana connection
const connection = new Connection(getRpcUrl(), 'confirmed');
console.log(`Using RPC: ${getRpcUrl().replace(/api-key=.*/, 'api-key=***')}`);

const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

// ============================================
// BONDING CURVE CONSTANTS (matching Rust program)
// Constant Product Formula: x * y = k
// ============================================
const VIRTUAL_SOL_RESERVES = 30_000_000_000n; // 30 SOL in lamports
const VIRTUAL_TOKEN_RESERVES = 1_073_000_000_000_000n; // 1.073B tokens (6 decimals)
const REAL_TOKEN_RESERVES = 793_100_000_000_000n; // 793.1M tokens available for trading
const TOTAL_SUPPLY = 1_000_000_000_000_000n; // 1B tokens (6 decimals)
const FEE_BPS = 100n; // 1% fee
const GRADUATION_SOL_THRESHOLD = 85_000_000_000n; // 85 SOL

// SQLite DB handle (initialized at startup)
let db;

// WebSocket server (initialized after HTTP server starts)
let wss = null;
const wsClients = new Map(); // client -> subscribed mints

// In-memory storage (use database in production)
const tradesStore = new Map(); // mint -> trades[]
const tokenStore = new Map(); // mint -> tokenInfo
const chartDataStore = new Map(); // mint -> candles[]
const curveStateStore = new Map(); // mint -> { virtualSol, virtualTokens, realSol, realTokens }
const subscribedMints = new Set();

// Referral persistence is stored in SQLite (see backend/db.js)

// ============================================
// PINATA CONFIGURATION
// ============================================

// Pinata setup for IPFS image/metadata storage
// Get your API keys at https://pinata.cloud/
const PINATA_API_KEY = process.env.PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || '';

let pinata = null;
if (PINATA_API_KEY && PINATA_SECRET_KEY) {
    try {
        pinata = new PinataSDK({
            pinataJwt: PINATA_API_KEY,
            pinataGateway: 'gateway.pinata.cloud'
        });
        console.log('[Pinata] Initialized successfully');
    } catch (error) {
        console.error('[Pinata] Initialization error:', error.message);
    }
} else {
    console.warn('[Pinata] API keys not configured - image/metadata uploads disabled');
}

// Configure multer for file uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// ============================================
// REFERRAL API ENDPOINTS
// ============================================

// Create/Get referral code
app.post('/api/referrals/create', async (req, res) => {
    const { wallet, code } = req.body;
    if (!wallet || !code) return res.status(400).json({ error: 'Missing wallet or code' });
    try {
        // If code is taken by another wallet, reject
        const existing = await dbGet(db, 'SELECT wallet FROM referral_codes WHERE code = ?', [code]);
        if (existing && existing.wallet !== wallet) {
            return res.status(400).json({ error: 'Code already taken' });
        }

        // Upsert referral code for wallet
        await dbRun(
            db,
            `INSERT INTO referral_codes (wallet, code, created_at)
             VALUES (?, ?, ?)
             ON CONFLICT(wallet) DO UPDATE SET code = excluded.code`,
            [wallet, code, Date.now()]
        );

        // Ensure earnings row exists
        await dbRun(
            db,
            `INSERT INTO referral_earnings (wallet, total, pending, claimed)
             VALUES (?, 0, 0, 0)
             ON CONFLICT(wallet) DO NOTHING`,
            [wallet]
        );

        res.json({ wallet, code, createdAt: new Date().toISOString() });
    } catch (e) {
        console.error('Referral create failed:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Get referral code for wallet
app.get('/api/referrals/:wallet', async (req, res) => {
    const { wallet } = req.params;
    try {
        const row = await dbGet(db, 'SELECT code FROM referral_codes WHERE wallet = ?', [wallet]);
        if (!row) return res.status(404).json({ error: 'No code found' });
        res.json({ wallet, code: row.code });
    } catch (e) {
        console.error('Referral get failed:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Get referrer for a user
app.get('/api/referrals/referrer/:wallet', async (req, res) => {
    const { wallet } = req.params;
    try {
        const row = await dbGet(db, 'SELECT code FROM referred_users WHERE wallet = ?', [wallet]);
        if (!row) return res.status(404).json({ error: 'Not referred' });
        res.json({ wallet, code: row.code });
    } catch (e) {
        console.error('Referrer lookup failed:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Register a referred user
app.post('/api/referrals/register', async (req, res) => {
    const { code, wallet } = req.body;
    if (!code || !wallet) return res.status(400).json({ error: 'Missing data' });
    try {
        // Find referrer wallet (must exist)
        const refRow = await dbGet(db, 'SELECT wallet FROM referral_codes WHERE code = ?', [code]);
        if (!refRow) return res.status(404).json({ error: 'Invalid code' });

        const referrerWallet = refRow.wallet;
        if (referrerWallet === wallet) return res.status(400).json({ error: 'Cannot refer yourself' });

        // Only register if not already referred
        await dbRun(
            db,
            `INSERT INTO referred_users (wallet, code, created_at)
             VALUES (?, ?, ?)
             ON CONFLICT(wallet) DO NOTHING`,
            [wallet, code, Date.now()]
        );

        // Ensure materialized referrals list row exists
        await dbRun(
            db,
            `INSERT INTO referrals (referrer_wallet, referred_wallet, joined_at, last_action, volume, earnings)
             VALUES (?, ?, ?, 'signup', 0, 0)
             ON CONFLICT(referrer_wallet, referred_wallet) DO NOTHING`,
            [referrerWallet, wallet, Date.now()]
        );

        res.json({ success: true });
    } catch (e) {
        console.error('Referral register failed:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Record earning
app.post('/api/referrals/earning', async (req, res) => {
    const { code, earning, action, mint, referredWallet, originalFee } = req.body;
    try {
        const refRow = await dbGet(db, 'SELECT wallet FROM referral_codes WHERE code = ?', [code]);
        if (!refRow) return res.status(404).json({ error: 'Invalid code' });

        const referrerWallet = refRow.wallet;

        // Ensure earnings row exists
        await dbRun(
            db,
            `INSERT INTO referral_earnings (wallet, total, pending, claimed)
             VALUES (?, 0, 0, 0)
             ON CONFLICT(wallet) DO NOTHING`,
            [referrerWallet]
        );

        // Update aggregates
        await dbRun(
            db,
            `UPDATE referral_earnings
             SET total = total + ?, pending = pending + ?
             WHERE wallet = ?`,
            [earning, earning, referrerWallet]
        );

        // Insert history row
        await dbRun(
            db,
            `INSERT INTO referral_earnings_history
             (referrer_wallet, referred_wallet, action, mint, original_fee, earning, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [referrerWallet, referredWallet || null, action || null, mint || null, originalFee || null, earning, Date.now()]
        );

        // Update materialized referral row
        const fee = Number(originalFee || 0);
        const volumeEstimate = fee > 0 ? fee * 100 : 0; // fee ~1%
        await dbRun(
            db,
            `INSERT INTO referrals (referrer_wallet, referred_wallet, joined_at, last_action, volume, earnings)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(referrer_wallet, referred_wallet) DO UPDATE SET
               last_action = excluded.last_action,
               volume = referrals.volume + excluded.volume,
               earnings = referrals.earnings + excluded.earnings`,
            [referrerWallet, referredWallet || 'unknown', Date.now(), action || 'trade', volumeEstimate, earning]
        );

        const stats = await dbGet(db, 'SELECT pending FROM referral_earnings WHERE wallet = ?', [referrerWallet]);
        res.json({ success: true, newPending: stats?.pending || 0 });
    } catch (e) {
        console.error('Referral earning failed:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Get earnings
app.get('/api/referrals/:wallet/earnings', async (req, res) => {
    const { wallet } = req.params;
    try {
        const agg = await dbGet(
            db,
            'SELECT total, pending, claimed FROM referral_earnings WHERE wallet = ?',
            [wallet]
        );
        const history = await dbAll(
            db,
            `SELECT referred_wallet as referredWallet, action, mint, original_fee as originalFee, earning, timestamp
             FROM referral_earnings_history
             WHERE referrer_wallet = ?
             ORDER BY timestamp DESC
             LIMIT 200`,
            [wallet]
        );

        res.json({
            total: agg?.total || 0,
            pending: agg?.pending || 0,
            claimed: agg?.claimed || 0,
            history: history.map(h => ({
                ...h,
                timestamp: new Date(h.timestamp).toISOString()
            }))
        });
    } catch (e) {
        console.error('Earnings get failed:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Get referrals list
app.get('/api/referrals/:wallet/list', async (req, res) => {
    const { wallet } = req.params;
    try {
        const rows = await dbAll(
            db,
            `SELECT referred_wallet as wallet,
                    joined_at as joinedAt,
                    last_action as action,
                    volume,
                    earnings
             FROM referrals
             WHERE referrer_wallet = ?
             ORDER BY joined_at DESC`,
            [wallet]
        );

        res.json(
            rows.map(r => ({
                ...r,
                joinedAt: new Date(r.joinedAt).toISOString()
            }))
        );
    } catch (e) {
        console.error('Referrals list failed:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Claim earnings
app.post('/api/referrals/claim', async (req, res) => {
    const { wallet } = req.body;
    try {
        const agg = await dbGet(db, 'SELECT pending FROM referral_earnings WHERE wallet = ?', [wallet]);
        const pending = agg?.pending || 0;
        if (pending <= 0) return res.status(400).json({ error: 'Nothing to claim' });

        await dbRun(
            db,
            `UPDATE referral_earnings
             SET claimed = claimed + pending, pending = 0
             WHERE wallet = ?`,
            [wallet]
        );

        // In a real app, this would trigger an on-chain payout.
        res.json({ success: true, amount: pending, newPending: 0 });
    } catch (e) {
        console.error('Claim failed:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// Debug: dump referral tables (dev-only)
app.get('/api/referrals/debug/dump', async (req, res) => {
    const enabled = (process.env.ENABLE_DEBUG_ENDPOINTS || '').toLowerCase() === 'true';
    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    if (!enabled || isProd) {
        return res.status(404).json({ error: 'Not found' });
    }

    try {
        const counts = {
            referral_codes: (await dbGet(db, 'SELECT COUNT(1) as c FROM referral_codes'))?.c || 0,
            referred_users: (await dbGet(db, 'SELECT COUNT(1) as c FROM referred_users'))?.c || 0,
            referral_earnings: (await dbGet(db, 'SELECT COUNT(1) as c FROM referral_earnings'))?.c || 0,
            referral_earnings_history: (await dbGet(db, 'SELECT COUNT(1) as c FROM referral_earnings_history'))?.c || 0,
            referrals: (await dbGet(db, 'SELECT COUNT(1) as c FROM referrals'))?.c || 0
        };

        const referralCodes = await dbAll(
            db,
            'SELECT wallet, code, created_at as createdAt FROM referral_codes ORDER BY created_at DESC LIMIT 50'
        );
        const referredUsers = await dbAll(
            db,
            'SELECT wallet, code, created_at as createdAt FROM referred_users ORDER BY created_at DESC LIMIT 50'
        );
        const earnings = await dbAll(
            db,
            'SELECT wallet, total, pending, claimed FROM referral_earnings ORDER BY pending DESC LIMIT 50'
        );
        const history = await dbAll(
            db,
            `SELECT referrer_wallet as referrerWallet,
                    referred_wallet as referredWallet,
                    action,
                    mint,
                    original_fee as originalFee,
                    earning,
                    timestamp
             FROM referral_earnings_history
             ORDER BY timestamp DESC
             LIMIT 50`
        );
        const referrals = await dbAll(
            db,
            `SELECT referrer_wallet as referrerWallet,
                    referred_wallet as wallet,
                    joined_at as joinedAt,
                    last_action as action,
                    volume,
                    earnings
             FROM referrals
             ORDER BY joined_at DESC
             LIMIT 50`
        );

        res.json({
            enabled: true,
            counts,
            referralCodes: referralCodes.map(r => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })),
            referredUsers: referredUsers.map(r => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })),
            earnings,
            history: history.map(h => ({ ...h, timestamp: new Date(h.timestamp).toISOString() })),
            referrals: referrals.map(r => ({ ...r, joinedAt: new Date(r.joinedAt).toISOString() }))
        });
    } catch (e) {
        console.error('Debug dump failed:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

// ============================================
// PINATA API ENDPOINTS
// ============================================

/**
 * Upload image to IPFS via Pinata
 * POST /api/pinata/upload-image
 * Content-Type: multipart/form-data
 * Body: { file: <image file> }
 * Response: { ipfsHash, url }
 */
app.post('/api/pinata/upload-image', upload.single('file'), async (req, res) => {
    try {
        if (!pinata) {
            return res.status(503).json({ error: 'Pinata not configured' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`[Pinata] Uploading image: ${req.file.originalname} (${req.file.size} bytes)`);

        // Upload to Pinata
        const uploadResult = await pinata.upload.file(req.file)
            .addMetadata({
                name: req.file.originalname,
                keyValues: {
                    type: 'token-image',
                    uploadedAt: new Date().toISOString()
                }
            });

        const ipfsHash = uploadResult.IpfsHash;
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

        console.log(`[Pinata] Image uploaded successfully: ${ipfsHash}`);

        res.json({
            success: true,
            ipfsHash,
            url: ipfsUrl
        });

    } catch (error) {
        console.error('[Pinata] Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed',
            message: error.message 
        });
    }
});

/**
 * Upload metadata JSON to IPFS via Pinata
 * POST /api/pinata/upload-metadata
 * Content-Type: application/json
 * Body: { name, symbol, description, imageUrl }
 * Response: { ipfsHash, url }
 */
app.post('/api/pinata/upload-metadata', async (req, res) => {
    try {
        if (!pinata) {
            return res.status(503).json({ error: 'Pinata not configured' });
        }

        const { name, symbol, description, imageUrl } = req.body;

        if (!name || !symbol || !imageUrl) {
            return res.status(400).json({ error: 'Missing required fields: name, symbol, imageUrl' });
        }

        console.log(`[Pinata] Uploading metadata for token: ${name} (${symbol})`);

        // Create metadata JSON following Metaplex standard
        const metadata = {
            name,
            symbol,
            description: description || '',
            image: imageUrl,
            attributes: [],
            properties: {
                files: [
                    {
                        uri: imageUrl,
                        type: 'image/png'
                    }
                ],
                category: 'image',
                creators: []
            }
        };

        // Upload JSON to Pinata
        const uploadResult = await pinata.upload.json(metadata)
            .addMetadata({
                name: `${symbol}-metadata.json`,
                keyValues: {
                    type: 'token-metadata',
                    tokenSymbol: symbol,
                    uploadedAt: new Date().toISOString()
                }
            });

        const ipfsHash = uploadResult.IpfsHash;
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

        console.log(`[Pinata] Metadata uploaded successfully: ${ipfsHash}`);

        res.json({
            success: true,
            ipfsHash,
            url: ipfsUrl,
            metadata
        });

    } catch (error) {
        console.error('[Pinata] Metadata upload error:', error);
        res.status(500).json({ 
            error: 'Metadata upload failed',
            message: error.message 
        });
    }
});

/**
 * Get Pinata status
 * GET /api/pinata/status
 */
app.get('/api/pinata/status', (req, res) => {
    res.json({
        configured: !!pinata,
        ready: !!pinata,
        gateway: pinata ? 'gateway.pinata.cloud' : null
    });
});

// ============================================
// HELIUS WEBHOOK ENDPOINTS
// ============================================

// Instruction discriminators for parsing (must match fuse-program-client.js)
const INSTRUCTION_DISCRIMINATORS = {
    createToken: Buffer.from([84, 52, 204, 228, 24, 140, 234, 75]),
    buy:         Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]),
    sell:        Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]),
    migrate:     Buffer.from([155, 234, 231, 146, 236, 158, 162, 30])
};

/**
 * Verify Helius webhook signature
 * Helius signs webhooks with HMAC-SHA256 using your webhook secret
 */
function verifyHeliusSignature(payload, signature) {
    if (!HELIUS_WEBHOOK_SECRET) {
        console.warn('HELIUS_WEBHOOK_SECRET not set - skipping signature verification');
        return true; // Allow in dev mode
    }
    
    const hmac = crypto.createHmac('sha256', HELIUS_WEBHOOK_SECRET);
    hmac.update(JSON.stringify(payload));
    const expectedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature || '', 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

/**
 * Parse instruction data to determine instruction type
 */
function parseInstructionType(data) {
    if (!data || data.length < 8) return null;
    
    const discriminator = Buffer.from(data.slice(0, 8));
    
    for (const [name, disc] of Object.entries(INSTRUCTION_DISCRIMINATORS)) {
        if (discriminator.equals(disc)) {
            return name;
        }
    }
    return null;
}

/**
 * POST /api/helius/webhook
 * Receives transaction notifications from Helius
 * 
 * To set up:
 * 1. Go to https://dev.helius.xyz/dashboard/webhooks
 * 2. Create a webhook with:
 *    - URL: https://your-domain.com/api/helius/webhook
 *    - Transaction Type: Any or Program
 *    - Account Addresses: Your program ID (Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS)
 * 3. Copy the webhook secret to HELIUS_WEBHOOK_SECRET env var
 */
app.post('/api/helius/webhook', async (req, res) => {
    const signature = req.headers['x-helius-signature'] || req.headers['helius-signature'];
    
    // Verify signature in production
    if (HELIUS_WEBHOOK_SECRET && !verifyHeliusSignature(req.body, signature)) {
        console.warn('Invalid Helius webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    try {
        const events = Array.isArray(req.body) ? req.body : [req.body];
        
        for (const event of events) {
            await processHeliusEvent(event);
        }
        
        res.status(200).json({ success: true, processed: events.length });
    } catch (error) {
        console.error('Helius webhook error:', error);
        res.status(500).json({ error: 'Processing failed' });
    }
});

/**
 * Process a single Helius transaction event
 */
async function processHeliusEvent(event) {
    // Helius can send different event formats
    const txSignature = event.signature || event.transaction?.signature;
    const timestamp = event.timestamp || Date.now();
    
    console.log(`Processing Helius event: ${txSignature}`);
    
    // Check if this transaction involves our program
    const instructions = event.instructions || 
                        event.transaction?.message?.instructions || 
                        [];
    
    // Also check accountData for parsed transactions
    const accountKeys = event.accountData?.map(a => a.account) || 
                       event.transaction?.message?.accountKeys || 
                       [];
    
    const programIdStr = PROGRAM_ID.toString();
    const involvesFuse = accountKeys.some(key => key === programIdStr) ||
                        instructions.some(ix => ix.programId === programIdStr);
    
    if (!involvesFuse) {
        console.log('Transaction does not involve FUSE program, skipping');
        return;
    }
    
    // Parse each instruction
    for (const ix of instructions) {
        if (ix.programId !== programIdStr) continue;
        
        const ixType = parseInstructionType(
            ix.data ? Buffer.from(ix.data, 'base64') : null
        );
        
        if (!ixType) continue;
        
        console.log(`Found ${ixType} instruction in tx ${txSignature}`);
        
        // Extract accounts based on instruction type
        const accounts = ix.accounts || [];
        
        switch (ixType) {
            case 'createToken':
                await handleCreateTokenEvent(accounts, ix.data, timestamp, txSignature);
                break;
            case 'buy':
                await handleBuyEvent(accounts, ix.data, timestamp, txSignature);
                break;
            case 'sell':
                await handleSellEvent(accounts, ix.data, timestamp, txSignature);
                break;
            case 'migrate':
                await handleMigrateEvent(accounts, ix.data, timestamp, txSignature);
                break;
        }
    }
    
    // Also check for parsed events in Helius enhanced format
    if (event.events?.nft || event.events?.swap) {
        // Helius may provide parsed events for known programs
        console.log('Helius parsed events:', JSON.stringify(event.events).slice(0, 200));
    }
}

/**
 * Helper to parse Borsh string from buffer
 */
function parseBorshString(buffer, offset) {
    const length = buffer.readUInt32LE(offset);
    const string = buffer.slice(offset + 4, offset + 4 + length).toString('utf8');
    return { string, nextOffset: offset + 4 + length };
}

/**
 * Handle create_token event from Helius
 */
async function handleCreateTokenEvent(accounts, data, timestamp, txSignature) {
    // Account order: creator, curve, mint, vault, creatorAta, treasury, system, token, ata, rent
    const creator = accounts[0];
    const mint = accounts[2];
    
    console.log(`Token created: ${mint} by ${creator}`);

    // Parse metadata from instruction data
    // Layout: discriminator(8) + name(str) + symbol(str) + uri(str)
    let name = 'Unknown';
    let symbol = 'UNK';
    let uri = '';
    
    try {
        if (data) {
            const buf = Buffer.from(data, 'base64');
            let offset = 8; // Skip discriminator
            
            const nameRes = parseBorshString(buf, offset);
            name = nameRes.string;
            offset = nameRes.nextOffset;
            
            const symbolRes = parseBorshString(buf, offset);
            symbol = symbolRes.string;
            offset = symbolRes.nextOffset;
            
            const uriRes = parseBorshString(buf, offset);
            uri = uriRes.string;
        }
    } catch (e) {
        console.error('Failed to parse createToken data:', e);
    }

    // Fetch Metadata to get Image URL
    let imageUri = '';
    if (uri) {
        try {
            // Handle IPFS gateways if needed
            const fetchUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
            const metaRes = await fetch(fetchUrl);
            if (metaRes.ok) {
                const meta = await metaRes.json();
                imageUri = meta.image || '';
            }
        } catch (e) {
            console.error('Failed to fetch metadata for image:', e);
        }
    }
    
    // Insert into DB
    try {
        await dbRun(db, `
            INSERT OR IGNORE INTO tokens (
                mint, name, symbol, uri, image_uri, creator, created_at, 
                virtual_sol, virtual_tokens, real_sol, real_tokens
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            mint, name, symbol, uri, imageUri, creator, timestamp,
            VIRTUAL_SOL_RESERVES.toString(),
            VIRTUAL_TOKEN_RESERVES.toString(),
            '0',
            REAL_TOKEN_RESERVES.toString()
        ]);
        console.log(`Indexed new token: ${name} (${symbol})`);
    } catch (e) {
        console.error('DB Insert Error:', e);
    }
    
    // Initialize token in store (keep for cache/websocket)
    if (!tokenStore.has(mint)) {
        tokenStore.set(mint, {
            mint,
            creator,
            createdAt: timestamp,
            signature: txSignature,
            name,
            symbol,
            uri,
            image: imageUri
        });
    }
    
    // Initialize curve state with defaults
    curveStateStore.set(mint, {
        virtualSol: VIRTUAL_SOL_RESERVES,
        virtualTokens: VIRTUAL_TOKEN_RESERVES,
        realSol: 0n,
        realTokens: REAL_TOKEN_RESERVES
    });
    
    // Broadcast to WebSocket clients
    broadcastToSubscribers(mint, {
        type: 'tokenCreated',
        mint,
        creator,
        timestamp,
        name,
        symbol,
        uri
    });
}

/**
 * Handle buy event from Helius
 */
async function handleBuyEvent(accounts, data, timestamp, txSignature) {
    // Account order: user, curve, mint, vault, userAta, treasury, token, system
    const user = accounts[0];
    const mint = accounts[2];
    
    // Parse instruction data: discriminator(8) + amountIn(8) + minTokensOut(8)
    let amountIn = 0n;
    let minTokensOut = 0n;
    
    if (data) {
        const buf = Buffer.from(data, 'base64');
        if (buf.length >= 24) {
            amountIn = buf.readBigUInt64LE(8);
            minTokensOut = buf.readBigUInt64LE(16);
        }
    }
    
    console.log(`Buy: ${user} bought tokens on ${mint}, spent ${amountIn} lamports`);
    
    // Calculate tokens out using bonding curve math
    const curveState = curveStateStore.get(mint) || {
        virtualSol: VIRTUAL_SOL_RESERVES,
        virtualTokens: VIRTUAL_TOKEN_RESERVES,
        realSol: 0n,
        realTokens: REAL_TOKEN_RESERVES
    };
    
    const fee = (amountIn * FEE_BPS) / 10000n;
    const netSolIn = amountIn - fee;
    const tokensOut = (curveState.virtualTokens * netSolIn) / (curveState.virtualSol + netSolIn);
    
    // Update curve state
    curveState.virtualSol = curveState.virtualSol + netSolIn;
    curveState.virtualTokens = curveState.virtualTokens - tokensOut;
    curveState.realSol = (curveState.realSol || 0n) + netSolIn;
    curveState.realTokens = (curveState.realTokens || REAL_TOKEN_RESERVES) - tokensOut;
    curveStateStore.set(mint, curveState);

    // Calculate Market Cap (in SOL)
    // Price = virtualSol / virtualTokens
    // MC = Price * TotalSupply (1B)
    const priceInSol = Number(curveState.virtualSol) / Number(curveState.virtualTokens);
    const marketCap = priceInSol * 1_000_000_000; // 1B tokens
    
    // Record trade in DB
    try {
        await dbRun(db, `
            INSERT OR IGNORE INTO trades (
                signature, mint, user, type, sol_amount, token_amount, timestamp, slot
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            txSignature, mint, user, 'buy', 
            Number(amountIn) / 1e9, Number(tokensOut) / 1e6, 
            timestamp, 0 // Slot not available in this context easily, using 0
        ]);

        // Update token stats in DB
        await dbRun(db, `
            UPDATE tokens SET 
                market_cap = ?,
                virtual_sol = ?,
                virtual_tokens = ?,
                real_sol = ?,
                real_tokens = ?
            WHERE mint = ?
        `, [
            marketCap,
            curveState.virtualSol.toString(),
            curveState.virtualTokens.toString(),
            curveState.realSol.toString(),
            curveState.realTokens.toString(),
            mint
        ]);
    } catch (e) {
        console.error('DB Update Error (Buy):', e);
    }
    
    // Record trade in memory (legacy)
    const trade = {
        type: 'buy',
        mint,
        user,
        solAmount: Number(amountIn) / 1e9,
        tokenAmount: Number(tokensOut) / 1e6,
        timestamp,
        signature: txSignature
    };
    
    if (!tradesStore.has(mint)) tradesStore.set(mint, []);
    tradesStore.get(mint).push(trade);
    
    // Update chart data
    updateChartData(mint, trade);
    
    // Broadcast to WebSocket clients
    broadcastToSubscribers(mint, {
        type: 'trade',
        data: {
            ...trade,
            curveState: {
                virtualSol: curveState.virtualSol.toString(),
                virtualTokens: curveState.virtualTokens.toString(),
                realSol: curveState.realSol.toString(),
                realTokens: curveState.realTokens.toString()
            },
            marketCap
        }
    });
}

/**
 * Handle sell event from Helius
 */
async function handleSellEvent(accounts, data, timestamp, txSignature) {
    // Account order: user, curve, mint, vault, userAta, treasury, token, system
    const user = accounts[0];
    const mint = accounts[2];
    
    // Parse instruction data: discriminator(8) + amountIn(8) + minSolOut(8)
    let tokenAmountIn = 0n;
    let minSolOut = 0n;
    
    if (data) {
        const buf = Buffer.from(data, 'base64');
        if (buf.length >= 24) {
            tokenAmountIn = buf.readBigUInt64LE(8);
            minSolOut = buf.readBigUInt64LE(16);
        }
    }
    
    console.log(`Sell: ${user} sold ${tokenAmountIn} tokens on ${mint}`);
    
    // Calculate SOL out using bonding curve math
    const curveState = curveStateStore.get(mint) || {
        virtualSol: VIRTUAL_SOL_RESERVES,
        virtualTokens: VIRTUAL_TOKEN_RESERVES,
        realSol: 0n,
        realTokens: REAL_TOKEN_RESERVES
    };
    
    const grossSolOut = (curveState.virtualSol * tokenAmountIn) / (curveState.virtualTokens + tokenAmountIn);
    const fee = (grossSolOut * FEE_BPS) / 10000n;
    const netSolOut = grossSolOut - fee;
    
    // Update curve state
    curveState.virtualSol = curveState.virtualSol - grossSolOut;
    curveState.virtualTokens = curveState.virtualTokens + tokenAmountIn;
    curveState.realSol = (curveState.realSol || 0n) - grossSolOut;
    curveState.realTokens = (curveState.realTokens || REAL_TOKEN_RESERVES) + tokenAmountIn;
    curveStateStore.set(mint, curveState);

    // Calculate Market Cap (in SOL)
    const priceInSol = Number(curveState.virtualSol) / Number(curveState.virtualTokens);
    const marketCap = priceInSol * 1_000_000_000; // 1B tokens

    // Record trade in DB
    try {
        await dbRun(db, `
            INSERT OR IGNORE INTO trades (
                signature, mint, user, type, sol_amount, token_amount, timestamp, slot
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            txSignature, mint, user, 'sell', 
            Number(netSolOut) / 1e9, Number(tokenAmountIn) / 1e6, 
            timestamp, 0
        ]);

        // Update token stats in DB
        await dbRun(db, `
            UPDATE tokens SET 
                market_cap = ?,
                virtual_sol = ?,
                virtual_tokens = ?,
                real_sol = ?,
                real_tokens = ?
            WHERE mint = ?
        `, [
            marketCap,
            curveState.virtualSol.toString(),
            curveState.virtualTokens.toString(),
            curveState.realSol.toString(),
            curveState.realTokens.toString(),
            mint
        ]);
    } catch (e) {
        console.error('DB Update Error (Sell):', e);
    }
    
    // Record trade in memory (legacy)
    const trade = {
        type: 'sell',
        mint,
        user,
        solAmount: Number(netSolOut) / 1e9,
        tokenAmount: Number(tokenAmountIn) / 1e6,
        timestamp,
        signature: txSignature
    };
    
    if (!tradesStore.has(mint)) tradesStore.set(mint, []);
    tradesStore.get(mint).push(trade);
    
    // Update chart data
    updateChartData(mint, trade);
    
    // Broadcast to WebSocket clients
    broadcastToSubscribers(mint, {
        type: 'trade',
        data: {
            ...trade,
            curveState: {
                virtualSol: curveState.virtualSol.toString(),
                virtualTokens: curveState.virtualTokens.toString(),
                realSol: curveState.realSol.toString(),
                realTokens: curveState.realTokens.toString()
            }
        }
    });
}

/**
 * Handle migrate (graduation) event from Helius
 */
async function handleMigrateEvent(accounts, data, timestamp, txSignature) {
    const mint = accounts[2]; // Assuming similar account order
    
    console.log(`Token ${mint} graduated to Raydium!`);
    
    // Mark curve as complete
    const curveState = curveStateStore.get(mint);
    if (curveState) {
        curveState.complete = true;
        curveStateStore.set(mint, curveState);
    }
    
    // Update token info
    const tokenInfo = tokenStore.get(mint);
    if (tokenInfo) {
        tokenInfo.graduated = true;
        tokenInfo.graduatedAt = timestamp;
        tokenStore.set(mint, tokenInfo);
    }
    
    // Broadcast graduation event
    broadcastToSubscribers(mint, {
        type: 'graduated',
        mint,
        timestamp
    });
}

/**
 * Broadcast message to all WebSocket clients subscribed to a mint
 */
function broadcastToSubscribers(mint, message) {
    if (!wss) return;
    
    const msgStr = JSON.stringify(message);
    
    for (const [client, subscribedMints] of wsClients.entries()) {
        if (subscribedMints.has(mint) && client.readyState === WebSocket.OPEN) {
            client.send(msgStr);
        }
    }
}

/**
 * GET /api/helius/status
 * Check Helius integration status
 */
app.get('/api/helius/status', (req, res) => {
    res.json({
        configured: !!HELIUS_API_KEY,
        rpcUrl: getRpcUrl().replace(/api-key=.*/, 'api-key=***'),
        webhookSecretSet: !!HELIUS_WEBHOOK_SECRET,
        network: NETWORK,
        programId: PROGRAM_ID.toString()
    });
});

/**
 * POST /api/helius/test-webhook
 * Test endpoint to simulate a Helius webhook (dev only)
 */
app.post('/api/helius/test-webhook', async (req, res) => {
    const enabled = (process.env.ENABLE_DEBUG_ENDPOINTS || '').toLowerCase() === 'true';
    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    
    if (!enabled || isProd) {
        return res.status(404).json({ error: 'Not found' });
    }
    
    try {
        await processHeliusEvent(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TOKEN API ENDPOINTS
// ============================================

// Serve token metadata JSON (dev/local)
app.get('/api/metadata/:mint.json', (req, res) => {
    const { mint } = req.params;
    const info = tokenStore.get(mint);

    if (!info) {
        return res.status(404).json({ error: 'Token not found' });
    }

    const image = info.image || (typeof info.uri === 'string' && info.uri.startsWith('data:image') ? info.uri : '');

    res.setHeader('Content-Type', 'application/json');
    res.json({
        name: info.name || '',
        symbol: info.symbol || '',
        description: info.description || '',
        image,
        external_url: info.website || '',
        attributes: [],
        properties: {
            files: image ? [{ uri: image, type: 'image/png' }] : [],
            category: 'token',
            creators: info.creator ? [{ address: info.creator, share: 100 }] : []
        },
        socials: {
            twitter: info.twitter || '',
            telegram: info.telegram || '',
            website: info.website || ''
        }
    });
});

// Register new token
app.post('/api/tokens', async (req, res) => {
    const tokenData = req.body;
    if (!tokenData.mint) return res.status(400).json({ error: 'Mint required' });
    
    tokenStore.set(tokenData.mint, {
        ...tokenData,
        // Normalize common fields
        name: tokenData.name,
        symbol: tokenData.symbol,
        uri: tokenData.uri || '',
        image: tokenData.image || null,
        description: tokenData.description || '',
        twitter: tokenData.twitter || '',
        telegram: tokenData.telegram || '',
        website: tokenData.website || '',
        creator: tokenData.creator,
        createdAt: Date.now(),
        marketCap: tokenData.initialBuyAmount || 0, // Initial mcap estimate
        replies: 0
    });
    
    // Initialize empty trades/chart
    tradesStore.set(tokenData.mint, []);
    chartDataStore.set(tokenData.mint, []);
    
    // Start indexing
    await startIndexing(tokenData.mint);
    
    res.json({ success: true });
});

// Get King of the Hill
app.get('/api/king', (req, res) => {
    // Simple logic: Find token with most trades in last hour or highest mcap
    // For demo, just pick the first one or random
    const tokens = Array.from(tokenStore.values());
    if (tokens.length === 0) return res.json(null);
    
    // Sort by market cap (mock)
    const king = tokens.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))[0];
    res.json(king);
});

// ============================================
// TRADE INDEXING
// ============================================

/**
 * Parse trade events from transaction logs
 */
function parseTradeEvent(logs, signature, slot) {
    const trades = [];
    
    for (const log of logs) {
        // Look for our program's trade events
        if (log.includes('Trade:')) {
            try {
                // Parse the log format: "Trade: BUY|SELL mint=X user=X sol=X tokens=X"
                const match = log.match(/Trade:\s*(BUY|SELL)\s+mint=(\w+)\s+user=(\w+)\s+sol=(\d+)\s+tokens=(\d+)/);
                if (match) {
                    trades.push({
                        signature,
                        type: match[1].toLowerCase(),
                        mint: match[2],
                        user: match[3],
                        solAmount: parseInt(match[4]) / 1e9,
                        tokenAmount: parseInt(match[5]) / 1e6,
                        timestamp: Date.now(),
                        slot
                    });
                }
            } catch (e) {
                console.error('Failed to parse trade log:', e);
            }
        }
    }
    
    return trades;
}

/**
 * Start indexing trades for a token
 */
async function startIndexing(mint) {
    if (subscribedMints.has(mint)) return;
    subscribedMints.add(mint);
    
    const mintPubkey = new PublicKey(mint);
    
    // Subscribe to program account changes
    connection.onLogs(
        PROGRAM_ID,
        async (logs, context) => {
            if (logs.err) return;
            
            const trades = parseTradeEvent(logs.logs, logs.signature, context.slot);
            
            for (const trade of trades) {
                if (trade.mint === mint) {
                    // Store trade
                    if (!tradesStore.has(mint)) {
                        tradesStore.set(mint, []);
                    }
                    tradesStore.get(mint).push(trade);
                    
                    // Update chart data
                    updateChartData(mint, trade);
                    
                    // Broadcast to WebSocket clients
                    broadcastTrade(trade);
                }
            }
        },
        'confirmed'
    );
    
    console.log(`Started indexing for ${mint}`);
}

/**
 * Update OHLCV chart data
 */
function updateChartData(mint, trade) {
    if (!chartDataStore.has(mint)) {
        chartDataStore.set(mint, []);
    }
    
    const candles = chartDataStore.get(mint);
    const candleInterval = 60000; // 1 minute candles
    const candleTime = Math.floor(trade.timestamp / candleInterval) * candleInterval;
    
    // Calculate price from trade
    const price = trade.solAmount / trade.tokenAmount;
    
    // Find or create candle
    let candle = candles.find(c => c.time === candleTime);
    
    if (!candle) {
        candle = {
            time: candleTime / 1000, // Lightweight Charts expects seconds
            open: price,
            high: price,
            low: price,
            close: price,
            volume: trade.solAmount
        };
        candles.push(candle);
        // Keep only last 1000 candles
        if (candles.length > 1000) {
            candles.shift();
        }
    } else {
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price;
        candle.volume += trade.solAmount;
    }
}

// ============================================
// API ROUTES
// ============================================

/**
 * GET /api/tokens
 * List all indexed tokens with stats
 */
app.get('/api/tokens', async (req, res) => {
    try {
        const { sort = 'newest', limit = 50 } = req.query;
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        
        let orderBy = 'created_at DESC';
        if (sort === 'marketcap') orderBy = 'market_cap DESC';
        if (sort === 'volume') orderBy = 'volume_24h DESC';
        
        // Query tokens with 24h volume calculation
        const tokens = await dbAll(db, `
            SELECT t.*, 
            COALESCE((
                SELECT SUM(sol_amount) 
                FROM trades tr 
                WHERE tr.mint = t.mint AND tr.timestamp > ?
            ), 0) as volume_24h,
            (
                SELECT COUNT(*) 
                FROM trades tr 
                WHERE tr.mint = t.mint
            ) as trade_count
            FROM tokens t
            ORDER BY ${orderBy}
            LIMIT ?
        `, [oneDayAgo, limit]);
        
        // Format response
        const formattedTokens = tokens.map(t => ({
            mint: t.mint,
            name: t.name,
            symbol: t.symbol,
            uri: t.uri,
            image: t.image_uri, // Return image URL
            creator: t.creator,
            createdAt: t.created_at,
            marketCap: t.market_cap,
            volume24h: t.volume_24h,
            tradeCount: t.trade_count,
            virtualSol: t.virtual_sol,
            virtualTokens: t.virtual_tokens,
            realSol: t.real_sol,
            realTokens: t.real_tokens,
            complete: !!t.complete
        }));
        
        res.json(formattedTokens);
    } catch (e) {
        console.error('Failed to fetch tokens:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * GET /api/tokens/:mint
 * Get token details
 */
app.get('/api/tokens/:mint', async (req, res) => {
    const { mint } = req.params;
    
    try {
        // Start indexing if not already (skip if mint isn't a valid pubkey)
        try {
            await startIndexing(mint);
        } catch (e) {
            console.warn(`Skipping indexing for invalid mint ${mint}:`, e?.message || e);
        }
        
        const info = tokenStore.get(mint) || {};
        const trades = tradesStore.get(mint) || [];
        const candles = chartDataStore.get(mint) || [];
        
        const lastTrade = trades[trades.length - 1];
        const firstTrade = trades[0];
        
        // Calculate price change using bonding curve state
        let priceChange24h = 0;
        if (trades.length >= 2) {
            const oldPrice = trades.find(t => t.timestamp > Date.now() - 86400000);
            if (oldPrice && lastTrade) {
                const oldP = oldPrice.solAmount / oldPrice.tokenAmount;
                const newP = lastTrade.solAmount / lastTrade.tokenAmount;
                priceChange24h = ((newP - oldP) / oldP) * 100;
            }
        }
        
        // Use bonding curve for current price calculation
        const currentPrice = calculateCurrentPrice(mint);
        const progress = calculateProgress(mint);
        
        res.json({
            mint,
            ...info,
            price: currentPrice,
            priceChange24h,
            volume24h: calculateVolume24h(trades),
            marketCap: calculateMarketCap(trades, mint),
            progress,
            holders: 0, // Would need to query token accounts
            tradeCount: trades.length,
            createdAt: firstTrade?.timestamp,
            curveState: curveStateStore.get(mint) || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tokens/:mint/trades
 * Get recent trades for a token
 */
app.get('/api/tokens/:mint/trades', (req, res) => {
    const { mint } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const trades = tradesStore.get(mint) || [];
    const sorted = [...trades].reverse(); // Most recent first
    const paginated = sorted.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
        trades: paginated,
        total: trades.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
    });
});

/**
 * GET /api/tokens/:mint/curve
 * Get bonding curve state for a token
 */
app.get('/api/tokens/:mint/curve', async (req, res) => {
    const { mint } = req.params;
    
    try {
        // Try to fetch from chain
        const curveState = await fetchCurveStateFromChain(mint);
        
        res.json({
            mint,
            virtualSolReserves: curveState.virtualSol.toString(),
            virtualTokenReserves: curveState.virtualTokens.toString(),
            realSolReserves: curveState.realSol.toString(),
            realTokenReserves: curveState.realTokens.toString(),
            currentPrice: calculateCurrentPrice(mint),
            marketCap: calculateMarketCap([], mint),
            progress: calculateProgress(mint),
            graduationThreshold: GRADUATION_SOL_THRESHOLD.toString()
        });
    } catch (error) {
        // Return default initial state
        res.json({
            mint,
            virtualSolReserves: VIRTUAL_SOL_RESERVES.toString(),
            virtualTokenReserves: VIRTUAL_TOKEN_RESERVES.toString(),
            realSolReserves: '0',
            realTokenReserves: REAL_TOKEN_RESERVES.toString(),
            currentPrice: Number(VIRTUAL_SOL_RESERVES) / Number(VIRTUAL_TOKEN_RESERVES) / 1e3,
            marketCap: 27.96, // Initial market cap
            progress: 0,
            graduationThreshold: GRADUATION_SOL_THRESHOLD.toString()
        });
    }
});

/**
 * GET /api/tokens/:mint/quote/buy
 * Preview a buy order using bonding curve math
 */
app.get('/api/tokens/:mint/quote/buy', (req, res) => {
    const { mint } = req.params;
    const { amount } = req.query;
    
    if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const solLamports = Math.floor(parseFloat(amount) * 1e9);
    const quote = calculateBuyAmount(mint, solLamports);
    
    const tokensHuman = Number(quote.tokensOut) / 1e6;
    const feeSOL = Number(quote.fee) / 1e9;
    
    res.json({
        mint,
        inputSOL: parseFloat(amount),
        outputTokens: tokensHuman,
        fee: feeSOL,
        pricePerToken: quote.pricePerToken,
        priceImpact: calculatePriceImpact(mint, 'buy', solLamports)
    });
});

/**
 * GET /api/tokens/:mint/quote/sell
 * Preview a sell order using bonding curve math
 */
app.get('/api/tokens/:mint/quote/sell', (req, res) => {
    const { mint } = req.params;
    const { amount } = req.query;
    
    if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const tokenAmount = Math.floor(parseFloat(amount) * 1e6); // 6 decimals
    const quote = calculateSellAmount(mint, tokenAmount);
    
    const solHuman = Number(quote.solOut) / 1e9;
    const feeSOL = Number(quote.fee) / 1e9;
    
    res.json({
        mint,
        inputTokens: parseFloat(amount),
        outputSOL: solHuman,
        fee: feeSOL,
        pricePerToken: quote.pricePerToken,
        priceImpact: calculatePriceImpact(mint, 'sell', tokenAmount)
    });
});

/**
 * Calculate price impact for a trade
 */
function calculatePriceImpact(mint, side, amount) {
    const curveState = curveStateStore.get(mint) || {
        virtualSol: VIRTUAL_SOL_RESERVES,
        virtualTokens: VIRTUAL_TOKEN_RESERVES
    };
    
    const virtualSol = Number(curveState.virtualSol);
    const virtualTokens = Number(curveState.virtualTokens);
    const spotPrice = virtualSol / virtualTokens;
    
    if (side === 'buy') {
        const netSolIn = Number(amount) * 0.99; // After 1% fee
        const tokensOut = (virtualTokens * netSolIn) / (virtualSol + netSolIn);
        const effectivePrice = Number(amount) / tokensOut;
        return ((effectivePrice - spotPrice) / spotPrice) * 100;
    } else {
        const grossSolOut = (virtualSol * Number(amount)) / (virtualTokens + Number(amount));
        const netSolOut = grossSolOut * 0.99; // After 1% fee
        const effectivePrice = netSolOut / Number(amount);
        return ((spotPrice - effectivePrice) / spotPrice) * 100;
    }
}

/**
 * Fetch curve state from on-chain PDA
 */
async function fetchCurveStateFromChain(mint) {
    try {
        const mintPubkey = new PublicKey(mint);
        const [curvePda] = PublicKey.findProgramAddressSync(
            [Buffer.from('curve'), mintPubkey.toBuffer()],
            PROGRAM_ID
        );
        
        const accountInfo = await connection.getAccountInfo(curvePda);
        if (!accountInfo) {
            throw new Error('Curve account not found');
        }
        
        // Decode the BondingCurve account
        // Layout: discriminator(8) + creator(32) + tokenMint(32) + virtualSol(8) + virtualTokens(8) + realSol(8) + realTokens(8) + complete(1) + ...
        const data = accountInfo.data;
        let offset = 8; // Skip discriminator
        
        offset += 32; // Skip creator
        offset += 32; // Skip tokenMint
        
        const virtualSol = data.readBigUInt64LE(offset);
        offset += 8;
        const virtualTokens = data.readBigUInt64LE(offset);
        offset += 8;
        const realSol = data.readBigUInt64LE(offset);
        offset += 8;
        const realTokens = data.readBigUInt64LE(offset);
        
        const curveState = {
            virtualSol,
            virtualTokens,
            realSol,
            realTokens
        };
        
        // Cache it
        curveStateStore.set(mint, curveState);
        
        return curveState;
    } catch (e) {
        console.warn(`Failed to fetch curve state for ${mint}:`, e.message);
        
        // Return default state
        return {
            virtualSol: VIRTUAL_SOL_RESERVES,
            virtualTokens: VIRTUAL_TOKEN_RESERVES,
            realSol: 0n,
            realTokens: REAL_TOKEN_RESERVES
        };
    }
}

/**
 * GET /api/tokens/:mint/chart
 * Get OHLCV chart data
 */
app.get('/api/tokens/:mint/chart', (req, res) => {
    const { mint } = req.params;
    const { interval = '1m', from, to } = req.query;
    
    let candles = chartDataStore.get(mint) || [];
    
    // Filter by time range if provided
    if (from) {
        candles = candles.filter(c => c.time >= parseInt(from));
    }
    if (to) {
        candles = candles.filter(c => c.time <= parseInt(to));
    }
    
    res.json(candles);
});

/**
 * GET /api/tokens/:mint/trades
 * Get recent trades for a token
 */
app.get('/api/tokens/:mint/trades', (req, res) => {
    const { mint } = req.params;
    const { limit = 50 } = req.query;
    
    const trades = tradesStore.get(mint) || [];
    // Return most recent trades first
    const recentTrades = [...trades].reverse().slice(0, parseInt(limit));
    
    res.json(recentTrades);
});

/**
 * GET /api/tokens/:mint/holders
 * Get top holders
 */
app.get('/api/tokens/:mint/holders', async (req, res) => {
    const { mint } = req.params;
    try {
        const mintPubkey = new PublicKey(mint);
        const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
        
        // Get account info to find owners
        const accountKeys = largestAccounts.value.map(a => a.address);
        const accountsInfo = await connection.getMultipleAccountsInfo(accountKeys);
        
        // We need to parse the data manually since we don't have spl-token library here
        // Token Account Layout: mint(32) + owner(32) + amount(8) + ...
        // We just need the owner at offset 32
        
        const holders = largestAccounts.value.map((account, index) => {
            const info = accountsInfo[index];
            let owner = account.address.toString(); // Default to token account if parsing fails
            
            if (info && info.data.length >= 64) {
                const ownerPubkey = new PublicKey(info.data.slice(32, 64));
                owner = ownerPubkey.toString();
            }
            
            return {
                address: owner,
                amount: account.amount,
                uiAmount: account.uiAmount,
                percent: (account.uiAmount / 1000000000) * 100 // Assuming 1B supply
            };
        });
        
        // Filter out the bonding curve itself if needed, or label it
        // For now just return all
        
        res.json(holders);
    } catch (e) {
        console.error('Error fetching holders:', e);
        res.status(500).json({ error: 'Failed to fetch holders' });
    }
});

/**
 * GET /api/tokens/:mint/stats
 * Get aggregated stats
 */
app.get('/api/tokens/:mint/stats', (req, res) => {
    const { mint } = req.params;
    const trades = tradesStore.get(mint) || [];
    
    const now = Date.now();
    const trades1h = trades.filter(t => t.timestamp > now - 3600000);
    const trades24h = trades.filter(t => t.timestamp > now - 86400000);
    
    const buyers = new Set(trades.filter(t => t.type === 'buy').map(t => t.user));
    const sellers = new Set(trades.filter(t => t.type === 'sell').map(t => t.user));
    
    res.json({
        volume1h: trades1h.reduce((sum, t) => sum + t.solAmount, 0),
        volume24h: trades24h.reduce((sum, t) => sum + t.solAmount, 0),
        buys1h: trades1h.filter(t => t.type === 'buy').length,
        sells1h: trades1h.filter(t => t.type === 'sell').length,
        buys24h: trades24h.filter(t => t.type === 'buy').length,
        sells24h: trades24h.filter(t => t.type === 'sell').length,
        uniqueBuyers: buyers.size,
        uniqueSellers: sellers.size,
        totalTrades: trades.length
    });
});

/**
 * GET /api/king
 * Get current King of the Hill token
 */
app.get('/api/king', (req, res) => {
    let king = null;
    let maxVolume = 0;
    
    for (const [mint, info] of tokenStore.entries()) {
        const trades = tradesStore.get(mint) || [];
        const volume = calculateVolume24h(trades);
        
        if (volume > maxVolume) {
            maxVolume = volume;
            const lastTrade = trades[trades.length - 1];
            king = {
                mint,
                ...info,
                volume24h: volume,
                price: lastTrade ? lastTrade.solAmount / lastTrade.tokenAmount : 0
            };
        }
    }
    
    res.json(king);
});

/**
 * GET /api/trending
 * Get trending tokens
 */
app.get('/api/trending', (req, res) => {
    const { limit = 10 } = req.query;
    const tokens = [];
    
    for (const [mint, info] of tokenStore.entries()) {
        const trades = tradesStore.get(mint) || [];
        const recentTrades = trades.filter(t => t.timestamp > Date.now() - 3600000);
        
        tokens.push({
            mint,
            ...info,
            recentVolume: recentTrades.reduce((sum, t) => sum + t.solAmount, 0),
            recentTradeCount: recentTrades.length
        });
    }
    
    tokens.sort((a, b) => b.recentTradeCount - a.recentTradeCount);
    
    res.json(tokens.slice(0, parseInt(limit)));
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateVolume24h(trades) {
    const cutoff = Date.now() - 86400000;
    return trades
        .filter(t => t.timestamp > cutoff)
        .reduce((sum, t) => sum + t.solAmount, 0);
}

/**
 * Calculate market cap using bonding curve formula
 * Market Cap = Current Price × Total Supply
 * Current Price = virtualSol / virtualTokens (from curve state)
 */
function calculateMarketCap(trades, mint) {
    // Try to get curve state from store
    const curveState = curveStateStore.get(mint);
    
    if (curveState) {
        // Use real bonding curve state
        const virtualSol = Number(curveState.virtualSol);
        const virtualTokens = Number(curveState.virtualTokens);
        const price = virtualSol / virtualTokens; // lamports per token unit
        const totalSupplyHuman = Number(TOTAL_SUPPLY) / 1e6; // 1B tokens
        return (price * totalSupplyHuman) / 1e9; // Convert to SOL
    }
    
    // Fallback: calculate from initial curve state
    const price = Number(VIRTUAL_SOL_RESERVES) / Number(VIRTUAL_TOKEN_RESERVES);
    const totalSupplyHuman = Number(TOTAL_SUPPLY) / 1e6;
    return (price * totalSupplyHuman) / 1e9; // ~27.96 SOL initial market cap
}

/**
 * Calculate current token price from bonding curve
 * Uses constant product formula: price = virtualSol / virtualTokens
 */
function calculateCurrentPrice(mint) {
    const curveState = curveStateStore.get(mint);
    
    if (curveState) {
        const virtualSol = Number(curveState.virtualSol);
        const virtualTokens = Number(curveState.virtualTokens);
        return virtualSol / virtualTokens / 1e3; // Price per 1 token in lamports (adjusted for 6 decimals)
    }
    
    // Initial price from default curve
    return Number(VIRTUAL_SOL_RESERVES) / Number(VIRTUAL_TOKEN_RESERVES) / 1e3;
}

/**
 * Calculate tokens received for SOL input (buy preview)
 * Formula: tokensOut = (virtualTokens × netSolIn) / (virtualSol + netSolIn)
 */
function calculateBuyAmount(mint, solLamports) {
    const curveState = curveStateStore.get(mint) || {
        virtualSol: VIRTUAL_SOL_RESERVES,
        virtualTokens: VIRTUAL_TOKEN_RESERVES
    };
    
    const solIn = BigInt(solLamports);
    const fee = (solIn * FEE_BPS) / 10000n;
    const netSolIn = solIn - fee;
    
    const virtualSol = BigInt(curveState.virtualSol);
    const virtualTokens = BigInt(curveState.virtualTokens);
    
    // Constant product formula
    const tokensOut = (virtualTokens * netSolIn) / (virtualSol + netSolIn);
    
    return {
        tokensOut: tokensOut.toString(),
        fee: fee.toString(),
        netSolIn: netSolIn.toString(),
        pricePerToken: Number(solIn) / Number(tokensOut)
    };
}

/**
 * Calculate SOL received for token input (sell preview)
 * Formula: solOut = (virtualSol × tokenAmount) / (virtualTokens + tokenAmount)
 */
function calculateSellAmount(mint, tokenAmount) {
    const curveState = curveStateStore.get(mint) || {
        virtualSol: VIRTUAL_SOL_RESERVES,
        virtualTokens: VIRTUAL_TOKEN_RESERVES
    };
    
    const tokens = BigInt(tokenAmount);
    const virtualSol = BigInt(curveState.virtualSol);
    const virtualTokens = BigInt(curveState.virtualTokens);
    
    // Constant product formula
    const grossSolOut = (virtualSol * tokens) / (virtualTokens + tokens);
    const fee = (grossSolOut * FEE_BPS) / 10000n;
    const netSolOut = grossSolOut - fee;
    
    return {
        solOut: netSolOut.toString(),
        fee: fee.toString(),
        pricePerToken: Number(netSolOut) / Number(tokens)
    };
}

/**
 * Calculate graduation progress (0-100%)
 * Progress based on real SOL raised vs graduation threshold
 */
function calculateProgress(mint) {
    const curveState = curveStateStore.get(mint);
    if (!curveState) return 0;
    
    const realSol = Number(curveState.realSol || 0);
    const threshold = Number(GRADUATION_SOL_THRESHOLD);
    return Math.min(100, (realSol / threshold) * 100);
}

// ============================================
// WEBSOCKET SERVER
// ============================================

const server = app.listen(PORT, async () => {
    try {
        db = await initDb();
        console.log('SQLite DB initialized');
    } catch (e) {
        console.error('Failed to initialize SQLite DB:', e);
        process.exit(1);
    }

    console.log(`FUSE API server running on port ${PORT}`);
    console.log(`Helius integration: ${HELIUS_API_KEY ? 'ENABLED' : 'DISABLED (set HELIUS_API_KEY)'}`);
});

// Initialize WebSocket server
wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    wsClients.set(ws, new Set());
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            
            switch (msg.type) {
                case 'subscribe':
                    // Subscribe to token updates
                    wsClients.get(ws).add(msg.mint);
                    startIndexing(msg.mint);
                    ws.send(JSON.stringify({ type: 'subscribed', mint: msg.mint }));
                    break;
                    
                case 'unsubscribe':
                    wsClients.get(ws).delete(msg.mint);
                    ws.send(JSON.stringify({ type: 'unsubscribed', mint: msg.mint }));
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (e) {
            console.error('Invalid WebSocket message:', e);
        }
    });
    
    ws.on('close', () => {
        wsClients.delete(ws);
        console.log('WebSocket client disconnected');
    });
});

/**
 * Broadcast trade to all subscribed clients
 */
function broadcastTrade(trade) {
    const message = JSON.stringify({
        type: 'trade',
        data: trade
    });
    
    for (const [client, subscriptions] of wsClients.entries()) {
        if (subscriptions.has(trade.mint) && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

// ============================================
// DEMO DATA (for testing without real blockchain)
// ============================================

function generateDemoData() {
    const demoMint = 'DemoMint111111111111111111111111111111111';
    
    tokenStore.set(demoMint, {
        name: 'Demo Token',
        symbol: 'DEMO',
        uri: 'https://example.com/metadata.json',
        creator: 'DemoCreator1111111111111111111111111111111',
        createdAt: Date.now() - 3600000
    });
    
    // Generate 100 sample trades
    const trades = [];
    let price = 0.00001;
    
    for (let i = 0; i < 100; i++) {
        // Random walk price
        price *= (1 + (Math.random() - 0.48) * 0.1);
        price = Math.max(price, 0.000001);
        
        const type = Math.random() > 0.45 ? 'buy' : 'sell';
        const solAmount = (Math.random() * 2 + 0.1);
        const tokenAmount = solAmount / price;
        
        trades.push({
            signature: `sig${i}${Date.now()}`,
            type,
            mint: demoMint,
            user: `User${Math.floor(Math.random() * 20)}`,
            solAmount,
            tokenAmount,
            timestamp: Date.now() - (100 - i) * 60000,
            slot: 12345678 + i
        });
    }
    
    tradesStore.set(demoMint, trades);
    
    // Generate chart data
    for (const trade of trades) {
        updateChartData(demoMint, trade);
    }
    
    console.log('Demo data generated');
}

// Generate demo data on startup
generateDemoData();

module.exports = app;
