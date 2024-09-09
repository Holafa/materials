import { transferAllSol, transferAllTokensAndCloseAccount } from '../transaction/transfers';
import { WalletStorage } from '../wallet/wallet-storage';
import { Settings } from '../settings/settings';
import { TokenStorage } from '../token/token-storage';
import { UxMessageStream } from '../ux-message/ux-message-stream';

export async function handleWithdrawAllSolAndTokensFromBuyWalletsToDevWallet(
    walletStorage: WalletStorage,
    settings: Settings,
    tokenStorage: TokenStorage,
    messageStream: UxMessageStream
): Promise<void> {
    const wallets = await walletStorage.readWallets();
    const { devWallet, buyWallets } = wallets;
    if (!devWallet || buyWallets.length === 0) {
        console.error('Not enough wallets to perform the operation');
        return;
    }

    const tokenData = await tokenStorage.readToken();
    const mint = tokenData?.mint;

    for (const wallet of buyWallets) {
        try {
            if (mint) {
                await transferAllTokensAndCloseAccount(wallet, devWallet, mint, settings.priorityFeeLamports, messageStream);
            }
            await transferAllSol(wallet, devWallet, settings.priorityFeeLamports, messageStream);
        } catch (e) {
            // TODO[solana]: handle one-of-many-fails errors.
            console.error(`Error transferring all tokens and SOL from ${wallet} to ${devWallet}:`, e);
        }
    }
}
