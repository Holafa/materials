import { Markup, Scenes } from 'telegraf';
import { getOrCreateUser } from '../../user/get-or-create-user';
import { botPerUserManager } from '../../main';
import { handleFundBuyWallets } from '../../../handlers';
import { randomUniformDistribution } from '../../utils/random-utils';
import { TelegramUxMessageStream } from '../../ux-message/TelegramUxMessageStream';
import { walletScene } from './wallet.scene';
import { CastMyContext } from '../types';
import { FundBuyWalletsDistribution } from '../../../handlers/fundBuyWallets';
import { parseEnteredAmountOrReplyWithError } from '../../utils/input-utils';
import { replaceOrSendMessage } from '../../utils/replace-or-send-message';
import { deleteAndSendNewMessage } from '../../utils/delete-and-send-new-message';

type MyLocalContext = CastMyContext<{
    distribution: FundBuyWalletsDistribution
    totalAmount?: number;
    messageId?: number;
}>

export const fundBuyWalletsScene = new Scenes.BaseScene<MyLocalContext>('FUND_BUY_WALLETS_SCENE');

const backButton = Markup.inlineKeyboard([
    Markup.button.callback('🔙 Back', 'back_to_wallets')
]);

const cancelButton = Markup.inlineKeyboard([
    Markup.button.callback('❌ Cancel', 'cancel')
]);

fundBuyWalletsScene.enter(async (ctx: MyLocalContext) => {
    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);
    const { devWallet, buyWallets } = await walletStorage.readWallets();

    if (!devWallet) {
        const messageText = '❌ Dev wallet not found\\. Please create a dev wallet first\\.';
        await replaceOrSendMessage(ctx, messageText, backButton);
        return;
    }

    if (!buyWallets || buyWallets.length === 0) {
        const messageText = '❌ No buy wallets found\\. Please create buy wallets first\\.';
        await replaceOrSendMessage(ctx, messageText, backButton);
        return;
    }

    const messageText =  '🎃Please enter the total amount of SOL to distribute among buy wallets:';
    await replaceOrSendMessage(ctx, messageText, cancelButton);
});

fundBuyWalletsScene.on('message', async (ctx: MyLocalContext) => {
    const totalAmount = await parseEnteredAmountOrReplyWithError(ctx, { inlineKeyboardMarkup: cancelButton });
    if (totalAmount === undefined) {
        return;
    }
    await ctx.deleteMessage();
    ctx.scene.state.totalAmount = totalAmount;
    await generateDistributionAndAskConfirmation(ctx);
});

async function generateDistributionAndAskConfirmation(ctx: MyLocalContext) {
    const totalAmount = ctx.scene.state.totalAmount;
    if (!totalAmount) {
        await ctx.scene.enter(walletScene.id);
        return;
    }

    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);
    const { buyWallets } = await walletStorage.readWallets();

    const distributionAmounts = randomUniformDistribution(totalAmount, buyWallets.length);
    const distribution = buyWallets.map((buyWallet, index) => ({
        amount: distributionAmounts[index],
        buyWallet,
    }));
    ctx.scene.state.distribution = distribution;

    const distributionMessage = distribution.reduce((message, { buyWallet, amount }) => {
        return `${message}Wallet *${buyWallet.name}* \\(\`${buyWallet.publicKey.toBase58()}\`\\): \`${amount.toFixed(4)}\` SOL\n`;
    }, '📊 *Distribution Plan:*\n\n');

    const confirmButton = Markup.button.callback('✅ Confirm', 'confirm_distribution');
    const updateButton = Markup.button.callback('🔄 Update', 'update_distribution');

    await replaceOrSendMessage(ctx, distributionMessage, Markup.inlineKeyboard([
        [confirmButton, updateButton]
    ]));
}

fundBuyWalletsScene.action('confirm_distribution', async (ctx: MyLocalContext) => {
    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);
    const tokenStorage = botPerUserManager.getTokenStorage(user.userId);
    const distribution = ctx.scene.state.distribution;
    if (!distribution) {
        await ctx.scene.enter(walletScene.id, { messageId: ctx.scene.state.messageId });
        return;
    }

    await replaceOrSendMessage(ctx, '⏳ Processing the transactions\\.\\.\\.');
    try {
        await handleFundBuyWallets(distribution, walletStorage, user.settings, tokenStorage, new TelegramUxMessageStream(ctx));
        await deleteAndSendNewMessage(ctx, '✅ Funds distributed successfully\\!', backButton);
    } catch (error) {
        console.error('Error distributing funds:', error);
        await deleteAndSendNewMessage(ctx, '❌ Failed to distribute funds\\. Please try again later\\.', backButton);
    }
});

fundBuyWalletsScene.action('update_distribution', async (ctx: MyLocalContext) => {
    const totalAmount = ctx.scene.state.totalAmount;
    if (!totalAmount) {
        await ctx.scene.enter(walletScene.id, { messageId: ctx.scene.state.messageId });
        return;
    }
    await generateDistributionAndAskConfirmation(ctx);
});

fundBuyWalletsScene.action('cancel_distribution', async (ctx) => {
    await ctx.scene.enter(walletScene.id, { messageId: ctx.scene.state.messageId });
});