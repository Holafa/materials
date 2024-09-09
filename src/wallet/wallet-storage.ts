import { WalletData, WalletsData } from './types';
import { Keypair } from '@solana/web3.js';

export interface WalletStorage {
    addWallet(keypair: Keypair, type: 'buy' | 'dev'): Promise<WalletData>;

    readWallets(): Promise<WalletsData>;

    clearWallets(): Promise<void>;

    getDevWallet(): Promise<WalletData>;

    isEmpty(): Promise<boolean>;
}

