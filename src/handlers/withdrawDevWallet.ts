import { transferAllSol, transferAllTokensAndCloseAccount } from '../transaction/transfers';
import { WalletStorage } from '../wallet/wallet-storage';
import { Settings } from '../settings/settings';
import { TokenStorage } from '../token/token-storage';
import { UxMessageStream } from '../ux-message/ux-message-stream';
import { NamedWallet } from '../wallet/types';

export async function handleWithdrawDevWallet(
    destinationWallet: NamedWallet,
    walletStorage: WalletStorage,
    settings: Settings,
    tokenStorage: TokenStorage,
    messageStream: UxMessageStream
): Promise<void> {
    const devWallet = await walletStorage.getDevWallet();

    await transferAllSol(devWallet, destinationWallet, settings.priorityFeeLamports, messageStream);

    const tokenData = await tokenStorage.readToken();
    if (tokenData) {
        await transferAllTokensAndCloseAccount(devWallet, destinationWallet, tokenData.mint, settings.priorityFeeLamports, messageStream);
    }
}
