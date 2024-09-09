import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export function secretKeyToBase58(secretKey: Uint8Array): string {
    return bs58.encode(secretKey);
}

export function base58ToSecretKey(base58String: string): Uint8Array {
    const decoded = bs58.decode(base58String);
    if (decoded.length !== 64) throw new Error('Invalid private key length');
    return decoded;
}

export function createKeypairFromBase58(base58String: string): Keypair {
    return Keypair.fromSecretKey(base58ToSecretKey(base58String))
}

export function getBase58ByKeypair(keypair: Keypair): string {
    return secretKeyToBase58(keypair.secretKey);
}