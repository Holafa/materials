import { Context, Markup, Scenes } from 'telegraf';
import { CastMyContext } from "../types";
import { handleGenerateBuyWallets } from '../../../handlers/generateBuyWallets';
import { getOrCreateUser } from '../../user/get-or-create-user';
import { botPerUserManager } from '../../main';
import { walletScene } from './wallet.scene';
import { parseEnteredAmountOrReplyWithError } from '../../utils/input-utils';
import {replaceOrSendMessage} from "../../utils/replace-or-send-message";
import { MAXIMUM_BUY_WALLETS } from '../../../transaction/constants';

export type MyLocalContext = CastMyContext<{
    messageId?: number;
}>;

const backButton = Markup.inlineKeyboard([
    Markup.button.callback('🔙 Back', 'back_to_wallets')
]);

export const createBuyWalletsScene = new Scenes.BaseScene<MyLocalContext>('CREATE_BUY_WALLETS_SCENE');

async function getNumberOfCreatedBuyWallets(ctx: Context) {
    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);
    const { buyWallets } = await walletStorage.readWallets();
    return buyWallets.length;
}

createBuyWalletsScene.enter(async (ctx: MyLocalContext) => {
    const numberOfCreatedBuyWallets = await getNumberOfCreatedBuyWallets(ctx);
    if (numberOfCreatedBuyWallets >= MAXIMUM_BUY_WALLETS) {
        const messageText = `⚠️ No buy wallets can be created anymore: ${MAXIMUM_BUY_WALLETS} buy wallets created already`;
        await replaceOrSendMessage(ctx, messageText, backButton);
        return;
    }

    const maxWalletsToGenerate = MAXIMUM_BUY_WALLETS - numberOfCreatedBuyWallets;
    const messageText = `🎃Please enter the number of buy wallets to generate \\(1 to ${maxWalletsToGenerate}\\):`;
    await replaceOrSendMessage(ctx, messageText, backButton);
});

createBuyWalletsScene.on('message', async (ctx: MyLocalContext) => {
    const numberOfCreatedBuyWallets = await getNumberOfCreatedBuyWallets(ctx);
    const maxWalletsToGenerate = MAXIMUM_BUY_WALLETS - numberOfCreatedBuyWallets;
    if (maxWalletsToGenerate <= 0) {
        const messageText = `❌ You\\'ve reached the maximum number of buy wallets: ${MAXIMUM_BUY_WALLETS}\\. You cannot create more\\.`;
        await replaceOrSendMessage(ctx, messageText, backButton);
        return;
    }

    const count = await parseEnteredAmountOrReplyWithError(
      ctx,
      { min: 1, max: maxWalletsToGenerate, extraReply: backButton }
    );
    if (count === undefined) { // TODO[UX]: make the message from input-utils.ts updateable
        return;
    }

    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);

    try {
        await handleGenerateBuyWallets(count, walletStorage);
        const messageText = `✅ Successfully generated ${count} buy wallet\\(s\\)\\. You can check their information in the wallet manager 👜\\.`;
        await replaceOrSendMessage(ctx, messageText, backButton);
    } catch (error) {
        console.error('Error generating buy wallets:', error);
        const messageText = '❌ Failed to generate buy wallets\\. Please try again later\\.';
        await replaceOrSendMessage(ctx, messageText, backButton);
    }
    await ctx.deleteMessage();
});

createBuyWalletsScene.action('back_to_wallets', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(walletScene.id, { messageId: ctx.msgId });
});