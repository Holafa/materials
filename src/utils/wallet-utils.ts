import { PublicKey } from '@solana/web3.js';

export function isValidWalletAddress(walletAddress: string): boolean {
    try {
        new PublicKey(walletAddress);
        return true;
    } catch (error) {
        return false;
    }
}