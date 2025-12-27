const fs = require('fs');
const path = require('path');
const bip39 = require('bip39');
const ed25519 = require('ed25519-hd-key');
const { Keypair } = require('@solana/web3.js');

const MNEMONIC = process.env.MNEMONIC || 'prison napkin rural song party scatter swap boat pool mandate raccoon crystal';
const DEST_PATH = process.env.DEST || path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'solana', 'id.json');

(async () => {
  if (!bip39.validateMnemonic(MNEMONIC)) {
    console.error('Invalid mnemonic');
    process.exit(1);
  }

  const seed = await bip39.mnemonicToSeed(MNEMONIC);
  // Derive using Solana path m/44'/501'/0'/0'
  const derived = ed25519.derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
  const keypair = Keypair.fromSeed(derived.key);

  const secret = Array.from(keypair.secretKey);
  fs.mkdirSync(path.dirname(DEST_PATH), { recursive: true });
  fs.writeFileSync(DEST_PATH, JSON.stringify(secret));
  console.log('Written keypair to', DEST_PATH);
  console.log('Pubkey:', keypair.publicKey.toBase58());
})();
