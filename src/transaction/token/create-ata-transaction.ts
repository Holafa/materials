import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { BuiltTransaction } from '../built-transaction';
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';

export const RENT_FEE_OF_ASSOCIATED_TOKEN_ACCOUNT_LAMPORTS = 2039280n // 0.00203928 SOL.

// TODO[architecture][research]: problem with ATA instruction is that it occupies a lot of transaction size in raw bytes.
//  We can research the use of Address Lookup tables to put more public keys into one transaction.
const CREATE_ATA_MAX_COMPUTE_UNITS = 30_000;

export function createAtaTransaction(ownerKeypair: Keypair, mint: PublicKey): BuiltTransaction {
  const ownerAta = getAssociatedTokenAddressSync(mint, ownerKeypair.publicKey, false);
  const createBuyerAtaTransaction = new Transaction();
  const createAssociatedUserAtaInstruction = createAssociatedTokenAccountIdempotentInstruction(
    ownerKeypair.publicKey,
    ownerAta,
    ownerKeypair.publicKey,
    mint
  );
  createBuyerAtaTransaction.add(createAssociatedUserAtaInstruction);
  return {
    transaction: createBuyerAtaTransaction,
    signers: [ownerKeypair],
    feePayer: ownerKeypair,
    maxComputeUnits: CREATE_ATA_MAX_COMPUTE_UNITS
  };
}