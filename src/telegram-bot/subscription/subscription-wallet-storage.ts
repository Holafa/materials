import { WalletData } from '../../wallet/types';

export interface SubscriptionWalletStorage {
    saveWallet(wallet: WalletData): Promise<WalletData>;

    readWallet(): Promise<WalletData | undefined>;
}

