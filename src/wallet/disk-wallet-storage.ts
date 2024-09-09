import { DiskStorage } from '../storage/disk-storage';
import { Keypair } from '@solana/web3.js';
import { WalletData, WalletsData } from './types';
import { createKeypairFromBase58, getBase58ByKeypair } from '../utils/keypair-utils';
import { WalletStorage } from './wallet-storage';

/**
 * These types are only for serializing/deserializing wallet data to the file.
 */
type WalletDataOnDisk = {
    name: string;
    address: string;
    privateKey: string;
}
type WalletsDataOnDisk = {
    buyWallets: WalletDataOnDisk[];
    devWallet?: WalletDataOnDisk;
}

export class DiskWalletStorage implements WalletStorage {

    private static WALLET_STORAGE_KEY = 'wallets';

    constructor(private storage: DiskStorage) {
    }

    async addWallet(keypair: Keypair, type: 'buy' | 'dev'): Promise<WalletData> {
        const wallets = await this.readWallets();
        if (type === 'dev' && wallets.devWallet) {
            return wallets.devWallet;
        }

        const name = type === 'buy' ? `buywallet${wallets.buyWallets.length + 1}` : 'devwallet';
        const wallet = WalletData.create(name, keypair);
        if (type === 'buy') {
            wallets.buyWallets.push(wallet);
        } else if (type === 'dev') {
            wallets.devWallet = wallet;
        }

        await this.saveWallets(wallets);
        return wallet;
    }

    async readWallets(): Promise<WalletsData> {
        function createWalletDataByDataOnDisk(walletDataOnDisk: WalletDataOnDisk): WalletData {
            const name = walletDataOnDisk.name;
            const keypair = createKeypairFromBase58(walletDataOnDisk.privateKey);
            return WalletData.create(name, keypair);
        }

        const wallets = await this.storage.load<WalletsDataOnDisk>(DiskWalletStorage.WALLET_STORAGE_KEY) ?? {
            buyWallets: [],
            devWallet: undefined
        };
        const buyWallets = wallets.buyWallets.map(createWalletDataByDataOnDisk);
        const devWallet = wallets.devWallet ? createWalletDataByDataOnDisk(wallets.devWallet) : undefined;
        return { buyWallets, devWallet };
    }

    private async saveWallets(wallets: WalletsData): Promise<void> {
        function convert(walletData: WalletData): WalletDataOnDisk {
            const name = walletData.name;
            return {
                name,
                address: walletData.keypair.publicKey.toBase58(),
                privateKey: getBase58ByKeypair(walletData.keypair),
            }
        }

        const walletsToSave: WalletsDataOnDisk = {
            buyWallets: wallets.buyWallets.map(convert),
            devWallet: wallets.devWallet ? convert(wallets.devWallet) : undefined
        };

        await this.storage.save(DiskWalletStorage.WALLET_STORAGE_KEY, walletsToSave);
    }

    async clearWallets(): Promise<void> {
        await this.storage.delete(DiskWalletStorage.WALLET_STORAGE_KEY);
    }

    async getDevWallet(): Promise<WalletData> {
        const wallets = await this.readWallets();
        const devWallet = wallets.devWallet;
        if (!devWallet) {
            throw new Error('DevWallet not found');
        }
        return devWallet;
    }

    async isEmpty(): Promise<boolean> {
        const walletsData = await this.readWallets();
        return walletsData.devWallet === undefined && walletsData.buyWallets.length === 0;
    }
}