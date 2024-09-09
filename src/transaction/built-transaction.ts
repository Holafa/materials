import { Keypair, Transaction } from '@solana/web3.js';
import { PriorityFeeMaxUnits } from './priority-fee';

export type BuiltTransaction = {
  transaction: Transaction,
  signers: Keypair[],
  feePayer: Keypair,
  maxComputeUnits: PriorityFeeMaxUnits
}

