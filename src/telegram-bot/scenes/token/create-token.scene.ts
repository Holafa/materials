import { Markup, Scenes } from 'telegraf';
import { CastMyWizardContext } from '../types';
import { getTextMessage } from '../index';
import { downloadPhoto } from '../../utils/photo-utils';
import { NewTokenMetadata } from '../../../pump-fun/types';
import { getOrCreateUser } from '../../user/get-or-create-user';
import { botPerUserManager } from '../../main';
import { handleCreateAndBuyToken } from '../../../handlers';
import { TelegramUxMessageStream } from '../../ux-message/TelegramUxMessageStream';
import { BuyPlan } from '../../../handlers/types';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { tokenScene } from './token.scene';
import { startScene } from '../start.scene';
import { buildBuyPlanByFullWalletBalances } from '../../../handlers/buyTokens';

type MyLocalContext = CastMyWizardContext<{
    tokenData: {
        name?: string;
        symbol?: string;
        description?: string;
        image?: Blob;
        twitterLink?: string;
        telegramLink?: string;
        websiteLink?: string;
    },
    // TODO[architecture]: make this state JSON serializable for persistent session storage.
    buyPlan: BuyPlan,
    newTokenMetadata?: NewTokenMetadata
}>

const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Back', 'back_to_main')],
]);

async function askTokenName(ctx: MyLocalContext) {
    ctx.scene.state.tokenData = {};
    await ctx.reply('Token name:');
    return ctx.wizard.next();
}

async function parseNameAndAskTokenTicker(ctx: MyLocalContext) {
    const name = getTextMessage(ctx);
    if (!name) {
        await ctx.reply('Token name cannot be empty. Please enter a valid token name:');
        return;
    }
    ctx.scene.state.tokenData.name = name;
    await ctx.reply('Token ticker:');
    return ctx.wizard.next();
}

async function parseTickerAndAskTokenDescription(ctx: MyLocalContext) {
    const ticker = getTextMessage(ctx);
    if (!ticker) {
        await ctx.reply('Token ticker cannot be empty. Please enter a valid token ticker:');
        return;
    }
    ctx.scene.session.state.tokenData.symbol = ticker;
    await ctx.reply('Token description:');
    return ctx.wizard.next();
}

async function parseDescriptionAndAskTokenPhoto(ctx: MyLocalContext) {
    ctx.scene.session.state.tokenData.description = getTextMessage(ctx);
    await ctx.reply('Please attach an image of the token:');
    return ctx.wizard.next();
}

async function parseTokenPhotoAndAskTwitterLink(ctx: MyLocalContext) {
    let tokenPhoto: Blob | undefined;
    try {
        tokenPhoto = await downloadPhoto(ctx);
    } catch (e) {
        console.error("Error downloading photo from the user");
        await ctx.reply('Please send a valid image as a photo (not a file).');
        return;
    }
    if (tokenPhoto === undefined) {
        await ctx.reply('Please send a valid image as a photo (not a file).');
        return;
    }
    ctx.scene.session.state.tokenData.image = tokenPhoto;
    await ctx.reply('Twitter link:');
    return ctx.wizard.next();
}

async function parseTwitterLinkAndAskTelegramLink(ctx: MyLocalContext) {
    // TODO[UX]: allow to skip this step and use no link.
    const twitterLink = getTextMessage(ctx);
    ctx.scene.session.state.tokenData.twitterLink = twitterLink ? twitterLink : undefined;
    await ctx.reply('Telegram link:');
    return ctx.wizard.next();
}

async function parseTelegramLinkAndAskWebsiteLink(ctx: MyLocalContext) {
    const telegramLink = getTextMessage(ctx);
    ctx.scene.session.state.tokenData.telegramLink = telegramLink ? telegramLink : undefined;
    await ctx.reply('Website link:');
    return ctx.wizard.next();
}

async function parseWebsiteLinkAndStartBuyPlanning(ctx: MyLocalContext) {
    const websiteLink = getTextMessage(ctx);
    ctx.scene.session.state.tokenData.websiteLink = websiteLink ? websiteLink : undefined;

    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);
    ctx.scene.state.buyPlan = await buildBuyPlanByFullWalletBalances(walletStorage, user.settings);

    return await askConfirmationOrCancellation(ctx);
}

async function askConfirmationOrCancellation(ctx: MyLocalContext) {
    const state = ctx.scene.session.state;
    const stateTokenData = state.tokenData;
    if (
      !stateTokenData.name
      || !stateTokenData.symbol
      || !stateTokenData.description
      || !stateTokenData.image
    ) {
        await ctx.scene.enter(tokenScene.id);
        return;
    }

    const newTokenMetadata: NewTokenMetadata = {
        name: stateTokenData.name,
        symbol: stateTokenData.symbol,
        description: stateTokenData.description,
        image: stateTokenData.image,
        telegram: stateTokenData.telegramLink,
        twitter: stateTokenData.twitterLink,
        website: stateTokenData.websiteLink
    };

    const buyPlan: BuyPlan = state.buyPlan;
    let confirmationMessage = '🪙 *Token info*:\n\n';
    confirmationMessage += `*Name*: \`${newTokenMetadata.name}\`\n`
    confirmationMessage += `*Symbol*: \`${newTokenMetadata.symbol}\`\n`
    confirmationMessage += `*Description*: \`${newTokenMetadata.description}\`\n`
    confirmationMessage += `*Image*: \`${newTokenMetadata.image.size}\` bytes\n`
    if (newTokenMetadata.telegram) {
        confirmationMessage += `*Telegram*: \`${newTokenMetadata.telegram}\`\n`;
    }
    if (newTokenMetadata.twitter) {
        confirmationMessage += `*Twitter*: \`${newTokenMetadata.twitter}\`\n`;
    }
    if (newTokenMetadata.website) {
        confirmationMessage += `*Website*: \`${newTokenMetadata.website}\`\n`;
    }
    confirmationMessage += "\n";
    confirmationMessage += '📊 *Buy Plan:*\n\n';
    buyPlan.forEach(({ wallet: buyWallet, buySolLamportsPowerAmount: amount}) => {
        confirmationMessage += `Wallet *${buyWallet.name}* \\(\`${buyWallet.publicKey.toBase58()}\`\\) will buy \`${(Number(amount) / LAMPORTS_PER_SOL).toFixed(4)}\` SOL\n`;
    });

    ctx.scene.state.newTokenMetadata = newTokenMetadata;

    await ctx.replyWithMarkdownV2(confirmationMessage, Markup.inlineKeyboard([
        [Markup.button.callback('✅ Confirm', 'confirm_create_and_buy')],
        [Markup.button.callback('❌ Cancel', 'cancel_create_and_buy')],
    ]));
}

export const createTokenScene = new Scenes.WizardScene<MyLocalContext>(
    'CREATE_TOKEN_SCENE',
    askTokenName,
    parseNameAndAskTokenTicker,
    parseTickerAndAskTokenDescription,
    parseDescriptionAndAskTokenPhoto,
    parseTokenPhotoAndAskTwitterLink,
    parseTwitterLinkAndAskTelegramLink,
    parseTelegramLinkAndAskWebsiteLink,
    parseWebsiteLinkAndStartBuyPlanning
)

createTokenScene.action('confirm_create_and_buy', async (ctx: MyLocalContext) => {
    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);
    const tokenStorage = botPerUserManager.getTokenStorage(user.userId);
    const newTokenMetadata = ctx.scene.state.newTokenMetadata;
    if (!newTokenMetadata) {
        await ctx.scene.leave();
        await ctx.scene.enter(tokenScene.id);
        return;
    }
    const buyPlan = ctx.scene.state.buyPlan;
    try {
        await handleCreateAndBuyToken(
          newTokenMetadata,
          walletStorage,
          user.settings,
          tokenStorage,
          buyPlan,
          new TelegramUxMessageStream(ctx)
        );
        await ctx.reply('✅ Token created successfully!');
    } catch (error) {
        console.error('Error creating token:', error);
        await ctx.reply('There was an error creating the token. Please try again.');
    } finally {
        await ctx.scene.enter(tokenScene.id);
    }
})

createTokenScene.action('cancel_create_and_buy', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(tokenScene.id);
})

createTokenScene.action('back_to_main', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(startScene.id, { messageId: ctx.msgId });
});