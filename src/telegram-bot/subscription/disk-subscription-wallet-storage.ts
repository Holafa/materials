import { SubscriptionWalletStorage } from './subscription-wallet-storage';
import { DiskStorage } from '../../storage/disk-storage';
import { WalletData } from '../../wallet/types';
import { createKeypairFromBase58, getBase58ByKeypair } from '../../utils/keypair-utils';

/**
 * These types are only for serializing/deserializing wallet data to the file.
 */
type SubscriptionWalletDataOnDisk = {
    name: string;
    address: string;
    privateKey: string;
}

export class DiskSubscriptionWalletStorage implements SubscriptionWalletStorage {

    private static SUBSCRIPTION_WALLET_STORAGE_KEY = 'subscription-wallet';

    constructor(private storage: DiskStorage) {
    }

    async readWallet(): Promise<WalletData | undefined> {
        function createWalletDataByDataOnDisk(walletDataOnDisk: SubscriptionWalletDataOnDisk): WalletData {
            const name = walletDataOnDisk.name;
            const keypair = createKeypairFromBase58(walletDataOnDisk.privateKey);
            return WalletData.create(name, keypair);
        }

        const walletDataOnDisk = await this.storage.load<SubscriptionWalletDataOnDisk>(DiskSubscriptionWalletStorage.SUBSCRIPTION_WALLET_STORAGE_KEY);
        if (!walletDataOnDisk) {
            return undefined;
        }
        return createWalletDataByDataOnDisk(walletDataOnDisk);
    }

    async saveWallet(wallet: WalletData): Promise<WalletData> {
        function convert(walletData: WalletData): SubscriptionWalletDataOnDisk {
            const name = walletData.name;
            return {
                name,
                address: walletData.keypair.publicKey.toBase58(),
                privateKey: getBase58ByKeypair(walletData.keypair),
            }
        }

        const walletToSave: SubscriptionWalletDataOnDisk = convert(wallet);
        await this.storage.save(DiskSubscriptionWalletStorage.SUBSCRIPTION_WALLET_STORAGE_KEY, walletToSave);
        return wallet;
    }

}