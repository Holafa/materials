import { transferSol } from '../transaction/transfers';
import { WalletStorage } from '../wallet/wallet-storage';
import { Settings } from '../settings/settings';
import { WalletData } from '../wallet/types';
import { TokenStorage } from '../token/token-storage';
import { UxMessageStream } from '../ux-message/ux-message-stream';

export type FundBuyWalletsDistribution = {
    buyWallet: WalletData;
    amount: number;
}[]

export async function handleFundBuyWallets(
    fundBuyWalletsDistribution: FundBuyWalletsDistribution,
    walletStorage: WalletStorage,
    settings: Settings,
    tokenStorage: TokenStorage,
    messageStream: UxMessageStream
): Promise<void> {
    const devWallet = await walletStorage.getDevWallet();

    for (const { buyWallet, amount } of fundBuyWalletsDistribution) {
        await transferSol(devWallet, buyWallet, amount, settings.priorityFeeLamports, messageStream);
    }
}
