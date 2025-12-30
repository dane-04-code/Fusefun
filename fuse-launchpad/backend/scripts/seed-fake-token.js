/**
 * Seed a fake token for development/testing
 */

const { initDb, run } = require('../db');

async function seedFakeToken() {
    const db = await initDb();

    // Generate a fake but valid-looking Solana address (base58)
    const fakeMint = 'FakE1234567890abcdefghijkLMNopqrstuVWXyz12';
    const fakeCreator = 'Dev123456789abcdefghijkLMNopqrstuVWXyz99';

    const token = {
        mint: fakeMint,
        name: 'Demo Token',
        symbol: 'DEMO',
        uri: 'https://arweave.net/demo-token-metadata',
        image_uri: 'https://picsum.photos/seed/demo/200/200',
        creator: fakeCreator,
        created_at: Date.now(),
        market_cap: 45000,
        virtual_sol: '35000000000',
        virtual_tokens: '1000000000000000',
        real_sol: '5000000000',
        real_tokens: '750000000000000',
        total_supply: '1000000000000000',
        complete: 0
    };

    try {
        await run(db, `
            INSERT OR REPLACE INTO tokens
            (mint, name, symbol, uri, image_uri, creator, created_at, market_cap, virtual_sol, virtual_tokens, real_sol, real_tokens, total_supply, complete)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            token.mint,
            token.name,
            token.symbol,
            token.uri,
            token.image_uri,
            token.creator,
            token.created_at,
            token.market_cap,
            token.virtual_sol,
            token.virtual_tokens,
            token.real_sol,
            token.real_tokens,
            token.total_supply,
            token.complete
        ]);

        console.log('Fake token seeded successfully!');
        console.log('Mint address:', token.mint);
        console.log('Trade URL: /trade/' + token.mint);

        // Add some fake trades
        const trades = [
            { sig: 'sig1', type: 'buy', sol: 0.5, tokens: 50000000, time: Date.now() - 3600000 },
            { sig: 'sig2', type: 'buy', sol: 1.0, tokens: 95000000, time: Date.now() - 2400000 },
            { sig: 'sig3', type: 'sell', sol: 0.3, tokens: 28000000, time: Date.now() - 1200000 },
            { sig: 'sig4', type: 'buy', sol: 2.5, tokens: 220000000, time: Date.now() - 600000 },
            { sig: 'sig5', type: 'buy', sol: 0.75, tokens: 62000000, time: Date.now() - 120000 },
        ];

        for (const trade of trades) {
            await run(db, `
                INSERT OR REPLACE INTO trades
                (signature, mint, user, type, sol_amount, token_amount, timestamp, slot)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                trade.sig + fakeMint.slice(0, 8),
                fakeMint,
                fakeCreator,
                trade.type,
                trade.sol,
                trade.tokens,
                trade.time,
                Math.floor(trade.time / 1000)
            ]);
        }

        console.log('Added 5 fake trades');

    } catch (error) {
        console.error('Error seeding token:', error);
    }

    db.close();
}

seedFakeToken();
