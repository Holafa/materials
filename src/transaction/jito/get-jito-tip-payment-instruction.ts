import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';

const JITO_TIP_WALLETS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
].map((address) => new PublicKey(address));

function selectRandomJitoWallet() {
  return JITO_TIP_WALLETS[Math.round(Math.random() * JITO_TIP_WALLETS.length)];
}

export function getJitoTipPaymentInstruction(bundlePayer: Keypair, jitoTipLamports: bigint) {
  return SystemProgram.transfer({
    fromPubkey: bundlePayer.publicKey,
    toPubkey: selectRandomJitoWallet(),
    lamports: jitoTipLamports
  });
}