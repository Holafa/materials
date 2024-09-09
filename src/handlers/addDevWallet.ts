import { Keypair } from '@solana/web3.js';
import { WalletData } from '../wallet/types';
import { WalletStorage } from '../wallet/wallet-storage';

export async function handleAddDevWallet(walletStorage: WalletStorage): Promise<WalletData> {
    const keypair = Keypair.generate();
    return await walletStorage.addWallet(keypair, 'dev');
}
