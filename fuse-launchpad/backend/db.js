const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');

// Allow DB path to be configured via environment variable (useful for Railway volumes)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'fuse.db');
const DB_DIR = path.dirname(DB_PATH);

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function openDb() {
  ensureDbDir();
  return new sqlite3.Database(DB_PATH);
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb() {
  const db = openDb();

  // Enable WAL for better durability/concurrency
  await run(db, 'PRAGMA journal_mode = WAL');

  // Create tokens table
  await run(db, `
    CREATE TABLE IF NOT EXISTS tokens (
      mint TEXT PRIMARY KEY,
      name TEXT,
      symbol TEXT,
      uri TEXT,
      image_uri TEXT,
      creator TEXT,
      created_at INTEGER,
      market_cap REAL DEFAULT 0,
      virtual_sol TEXT DEFAULT '30000000000',
      virtual_tokens TEXT DEFAULT '1073000000000000',
      real_sol TEXT DEFAULT '0',
      real_tokens TEXT DEFAULT '793100000000000',
      total_supply TEXT DEFAULT '1000000000000000',
      complete INTEGER DEFAULT 0
    )
  `);

  // Create trades table
  await run(db, `
    CREATE TABLE IF NOT EXISTS trades (
      signature TEXT PRIMARY KEY,
      mint TEXT,
      user TEXT,
      type TEXT,
      sol_amount REAL,
      token_amount REAL,
      timestamp INTEGER,
      slot INTEGER,
      FOREIGN KEY(mint) REFERENCES tokens(mint)
    )
  `);

  console.log('Database initialized with tables: tokens, trades');

  await run(db, 'PRAGMA foreign_keys = ON');

  // Referral codes: wallet -> code (unique)
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS referral_codes (
      wallet TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )`
  );

  // Referred users: user wallet -> referral code they used
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS referred_users (
      wallet TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`
  );

  // Earnings aggregated per referrer wallet
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS referral_earnings (
      wallet TEXT PRIMARY KEY,
      total INTEGER NOT NULL DEFAULT 0,
      pending INTEGER NOT NULL DEFAULT 0,
      claimed INTEGER NOT NULL DEFAULT 0
    )`
  );

  // Earnings history rows
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS referral_earnings_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_wallet TEXT NOT NULL,
      referred_wallet TEXT,
      action TEXT,
      mint TEXT,
      original_fee INTEGER,
      earning INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(referrer_wallet) REFERENCES referral_earnings(wallet)
    )`
  );

  // Referrals list table (materialized view for UI)
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS referrals (
      referrer_wallet TEXT NOT NULL,
      referred_wallet TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      last_action TEXT,
      volume INTEGER NOT NULL DEFAULT 0,
      earnings INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (referrer_wallet, referred_wallet)
    )`
  );

  console.log('Database initialized with referral tables');
  return db;
}

module.exports = {
  DB_PATH,
  initDb,
  run,
  get,
  all
};
