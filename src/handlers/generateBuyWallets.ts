import { WalletData } from '../wallet/types';
import { WalletStorage } from '../wallet/wallet-storage';
import { Keypair } from '@solana/web3.js';
import { MAXIMUM_BUY_WALLETS } from '../transaction/constants';

export async function handleGenerateBuyWallets(
    numberOfWallets: number,
    walletStorage: WalletStorage
): Promise<WalletData[]> {
    const { buyWallets } = await walletStorage.readWallets();
    if (buyWallets.length + numberOfWallets > MAXIMUM_BUY_WALLETS) {
        throw new Error(`Maximum ${MAXIMUM_BUY_WALLETS} are supported`);
    }
    const addedWallets = [];
    for (let i = 0; i < numberOfWallets; i++) {
        const keypair = Keypair.generate();
        const walletData = await walletStorage.addWallet(keypair, 'buy');
        addedWallets.push(walletData);
    }
    return addedWallets;
}
