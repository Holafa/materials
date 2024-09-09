import { Markup, Scenes } from 'telegraf';
import { isValidWalletAddress } from '../../../utils/wallet-utils';
import { getTextMessage } from '../index';
import { getOrCreateUser } from '../../user/get-or-create-user';
import { botPerUserManager } from '../../main';
import { handleWithdrawDevWallet } from '../../../handlers';
import { PublicKey } from '@solana/web3.js';
import { TelegramUxMessageStream } from '../../ux-message/TelegramUxMessageStream';
import { walletScene } from './wallet.scene';
import { CastMyContext } from '../types';
import { NamedWallet } from '../../../wallet/types';
import { replaceOrSendMessage } from '../../utils/replace-or-send-message';
import { deleteAndSendNewMessage } from '../../utils/delete-and-send-new-message';

type MyLocalContext = CastMyContext<{
    messageId?: number;
    destinationWallet: NamedWallet
}>

export const withdrawFromDevWalletScene = new Scenes.BaseScene<MyLocalContext>('WITHDRAW_FROM_DEV_WALLET_SCENE');

const backButton = Markup.inlineKeyboard([
    Markup.button.callback('🔙 Back', 'back_to_wallets')
]);

const cancelButton = Markup.inlineKeyboard([
    Markup.button.callback('❌ Cancel', 'cancel_withdrawal')
]);

withdrawFromDevWalletScene.enter(async (ctx: MyLocalContext) => {
    await replaceOrSendMessage(ctx, '🎃 Please enter the destination wallet address:', cancelButton)
});

withdrawFromDevWalletScene.on('message', async (ctx: MyLocalContext) => {
    const input = getTextMessage(ctx);

    if (!input || !isValidWalletAddress(input)) {
        await replaceOrSendMessage(ctx, '❌ Invalid wallet address\\. Please enter a valid wallet address:', cancelButton);
        await ctx.deleteMessage();
        return;
    }

    const destinationWallet = new PublicKey(input);
    ctx.scene.state.destinationWallet = new NamedWallet("destination", destinationWallet);

    const message = `🔄 *Confirm Withdrawal*\n\n*Destination Wallet:* \`${destinationWallet.toBase58()}\``;
    await replaceOrSendMessage(ctx, message, Markup.inlineKeyboard([
        [Markup.button.callback('✅ Confirm', 'confirm_withdrawal')],
        [Markup.button.callback('❌ Cancel', 'cancel_withdrawal')],
    ]));
    await ctx.deleteMessage();
});

withdrawFromDevWalletScene.action('confirm_withdrawal', async (ctx: MyLocalContext) => {
    const destinationWallet = ctx.scene.state.destinationWallet;
    if (!destinationWallet) {
        await ctx.scene.enter(walletScene.id);
        return;
    }

    await replaceOrSendMessage(ctx, '⏳ Processing the withdrawal\\.\\.\\.');

    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);
    const tokenStorage = botPerUserManager.getTokenStorage(user.userId);

    try {
        await handleWithdrawDevWallet(destinationWallet, walletStorage, user.settings, tokenStorage, new TelegramUxMessageStream(ctx));
        await deleteAndSendNewMessage(ctx, '✅ Withdrawal completed successfully\\!', backButton);
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        await deleteAndSendNewMessage(ctx, '❌ Failed to process the withdrawal\\. Please try again later\\.', cancelButton);
    }
});

withdrawFromDevWalletScene.action('cancel_withdrawal', async (ctx) => {
    await ctx.scene.enter(walletScene.id, { messageId: ctx.scene.state.messageId });
});

withdrawFromDevWalletScene.action('back_to_wallets', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(walletScene.id, { messageId: ctx.scene.state.messageId });
});
