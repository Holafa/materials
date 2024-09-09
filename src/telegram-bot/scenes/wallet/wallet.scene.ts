import { Markup, Scenes } from 'telegraf';
import { CastMyContext } from '../types';
import { replyWithWalletBalances, replyWithWalletPrivateKeys } from './reply-with-wallet-balances';
import { createDevWalletScene } from './create-dev-wallet.scene';
import { createBuyWalletsScene } from './create-buy-wallets.scene';
import { withdrawFromDevWalletScene } from './withdraw-dev-wallet.scene';
import { fundBuyWalletsScene } from './fund-buy-wallets.scene';
import { replaceOrSendMessage } from '../../utils/replace-or-send-message';
import { startScene } from '../start.scene';

export type MyLocalContext = CastMyContext<{
    messageId?: number;
}>;

export const walletScene = new Scenes.BaseScene<MyLocalContext>('WALLET_SCENE');

export const walletScenes = [
    walletScene,
    createDevWalletScene,
    createBuyWalletsScene,
    fundBuyWalletsScene,
    withdrawFromDevWalletScene
];

const backToWalletMenuKeyboard = Markup.inlineKeyboard([
    Markup.button.callback('🔙 Back', 'back_to_wallet_menu')
]);

walletScene.enter(async (ctx) => {
    const messageText = `
👋 *Welcome to the Wallet Manager\\!*

➡️ *Please choose an action below*:
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📄 Show Wallet Balances', 'reply_with_wallet_balances')],
        [Markup.button.callback('🔑 Show Wallet Private Keys', 'reply_with_wallet_private_keys')],
        [Markup.button.callback('🛠 Create Dev Wallet', 'create_dev_wallet')],
        [Markup.button.callback('🛠 Create Buy Wallets', 'create_buy_wallets')],
        [Markup.button.callback('💸 Fund Buy Wallets from Dev Wallet', 'fund_buy_wallets')],
        [Markup.button.callback('💰 Withdraw from Dev Wallet', 'withdraw_funds_from_dev_wallet')],
        [Markup.button.callback('🔙 Back', 'back_to_main')],
    ]);

    await replaceOrSendMessage(ctx, messageText, keyboard);
});

walletScene.action('reply_with_wallet_balances', async (ctx: MyLocalContext) => {
    await replyWithWalletBalances(ctx, backToWalletMenuKeyboard);
});

walletScene.action('reply_with_wallet_private_keys', async (ctx: MyLocalContext) => {
    await replyWithWalletPrivateKeys(ctx, backToWalletMenuKeyboard);
});

walletScene.action('create_dev_wallet', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(createDevWalletScene.id, { messageId: ctx.msgId });
});

walletScene.action('create_buy_wallets', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(createBuyWalletsScene.id, { messageId: ctx.msgId });
});

walletScene.action('fund_buy_wallets', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(fundBuyWalletsScene.id, { messageId: ctx.msgId });
});

walletScene.action('withdraw_funds_from_dev_wallet', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(withdrawFromDevWalletScene.id, { messageId: ctx.msgId });
});

walletScene.action('back_to_main', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(startScene.id, { messageId: ctx.msgId });
});

walletScene.action('back_to_wallet_menu', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(walletScene.id, { messageId: ctx.msgId });
});
