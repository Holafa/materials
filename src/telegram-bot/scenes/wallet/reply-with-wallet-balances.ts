import { getOrCreateUser } from '../../user/get-or-create-user';
import { botPerUserManager } from '../../main';
import {
    getShowWalletsPrivateKeysMessages,
    getShowWalletsBalancesMessages
} from '../../../handlers/showWallets';
import { Markup } from 'telegraf';
import { replaceOrSendMessage } from '../../utils/replace-or-send-message';
import { CastMyContext } from "../types";
import { InlineKeyboardMarkup } from '@telegraf/types/markup';

export type MyLocalContext = CastMyContext<{
    messageId?: number;
}>;

const NO_WALLETS_CREATED_MESSAGE = `🚫 *No wallets have been created yet\\.*

Please create wallets first to view their balances\\.`;


export async function replyWithWalletBalances(
  ctx: MyLocalContext,
  keyboard: Markup.Markup<InlineKeyboardMarkup>
) {
    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);
    const tokenStorage = botPerUserManager.getTokenStorage(user.userId);

    if (await walletStorage.isEmpty()) {
        await replaceOrSendMessage(ctx, NO_WALLETS_CREATED_MESSAGE, keyboard);
        return;
    }

    const walletBalanceMessages = await getShowWalletsBalancesMessages(walletStorage, tokenStorage);
    const message = '✅ Wallet balances displayed below:\n\n' + walletBalanceMessages.join("\n");
    await replaceOrSendMessage(ctx, message, keyboard);
}

export async function replyWithWalletPrivateKeys(
  ctx: MyLocalContext,
  keyboard: Markup.Markup<InlineKeyboardMarkup>
) {
    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);

    if (await walletStorage.isEmpty()) {
        await replaceOrSendMessage(ctx, NO_WALLETS_CREATED_MESSAGE, keyboard);
        return;
    }

    const privateKeyMessages = await getShowWalletsPrivateKeysMessages(walletStorage);
    const message = '✅ Wallet private keys displayed below:\n\n' + privateKeyMessages.join('\n');
    await replaceOrSendMessage(ctx, message, keyboard);
}