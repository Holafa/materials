import { Transaction, TransactionSignature, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

export function getSignature(
  transaction: Transaction | VersionedTransaction
): TransactionSignature {
  const signature =
    "signature" in transaction
      ? transaction.signature
      : transaction.signatures[0];
  if (!signature) {
    throw new Error(
      "Missing transaction signature, the transaction was not signed by the fee payer"
    );
  }
  return bs58.encode(signature);
}