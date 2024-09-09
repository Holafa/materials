import { Commitment, Finality } from '@solana/web3.js';

export const DEFAULT_COMMITMENT: Commitment = "confirmed";
export const DEFAULT_FINALITY: Finality = "confirmed";

// TODO[architecture]: increase the capacity of buys/sells in a bundle.
export const BUYS_PER_TRANSACTION = 4;
export const SELLS_PER_TRANSACTION = 4;
export const TOKEN_CREATION_TRANSACTION_FREE_BUNDLE_SLOTS = 4; // The first slot is the token creation transaction.
export const MAX_BUYS_PER_BUNDLE_ON_TOKEN_CREATION = TOKEN_CREATION_TRANSACTION_FREE_BUNDLE_SLOTS * BUYS_PER_TRANSACTION;
export const MAXIMUM_BUY_WALLETS = MAX_BUYS_PER_BUNDLE_ON_TOKEN_CREATION;

export const MINIMUM_LAMPORTS_BALANCE_TO_KEEP_ON_A_WALLET_FOR_UNEXPECTED_EXPENSES = 1_000_000n; // 0.001 SOL