import { BuiltTransaction } from './built-transaction';
import { createCloseAccountInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

const CLOSE_ATA_MAX_COMPUTE_UNITS = 5_000;

export function createCloseAtaTransaction(ownerKeypair: Keypair, mint: PublicKey): BuiltTransaction {
  const sellerAta = getAssociatedTokenAddressSync(mint, ownerKeypair.publicKey, false);
  const transaction = new Transaction();
  transaction.add(createCloseAccountInstruction(
    sellerAta,
    ownerKeypair.publicKey,
    ownerKeypair.publicKey
  ));
  return {
    transaction,
    signers: [ownerKeypair],
    feePayer: ownerKeypair,
    maxComputeUnits: CLOSE_ATA_MAX_COMPUTE_UNITS
  };
}