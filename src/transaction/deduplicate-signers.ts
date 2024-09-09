import { Keypair } from '@solana/web3.js';

export function deduplicateSigners(allSigners: Keypair[]): Keypair[] {
  const signers: Keypair[] = [];
  for (const signer of allSigners) {
    if (!signers.find((s) => s.publicKey.equals(signer.publicKey))) {
      signers.push(signer);
    }
  }
  return signers;
}