import { Keypair, Transaction } from '@solana/web3.js';
import { deduplicateSigners } from '../deduplicate-signers';
import { BuiltTransaction } from '../built-transaction';

export const MAX_TRANSACTIONS_IN_BUNDLE = 5;

export type JitoBundleTransaction = {
  transaction: BuiltTransaction,
}

export type JitoBundleId = string;

export class JitoBundle {
  public bundleTransactions: JitoBundleTransaction[] = [];

  addBundleTransaction(
    parts: BuiltTransaction[],
    feePayer: Keypair
  ) {
    const transaction = new Transaction();
    transaction.add(...parts.map((t) => t.transaction));
    const signers = deduplicateSigners(
      [
        feePayer,
        ...parts.flatMap((transaction) => transaction.signers)
      ]
    );
    const maxComputeUnits = parts.map((part) => part.maxComputeUnits).reduce((a, b) => a + b, 0);
    this.bundleTransactions.push({
      transaction: {
        transaction,
        feePayer,
        signers,
        maxComputeUnits
      }
    });
  }
}
