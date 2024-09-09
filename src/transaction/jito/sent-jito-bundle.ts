import { TransactionSignature } from '@solana/web3.js';
import { JitoBundleId } from './jito-bundle';

export type SentJitoBundle = {
  bundleId: JitoBundleId;
  transactionSignatures: TransactionSignature[];
}