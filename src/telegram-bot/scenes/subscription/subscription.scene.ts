import { Markup, Scenes } from 'telegraf';
import { User, UserSubscription } from '../../user/user';
import { millisecondsToHumanReadable } from '../../utils/time';
import { getOrCreateUser, saveUser } from '../../user/get-or-create-user';
import { getSolBalance } from '../../../balances/balancemanager';
import {
    LIFETIME_SUBSCRIPTION_PRICE_SOL,
    MONTHLY_SUBSCRIPTION_PRICE_SOL,
    WEEKLY_SUBSCRIPTION_PRICE_SOL
} from './subscription-price';
import { botPerUserManager } from '../../main';
import { WalletData } from '../../../wallet/types';
import { Keypair } from '@solana/web3.js';
import { CastMyContext } from '../types';
import { startScene } from '../start.scene';
import { replaceOrSendMessage } from '../../utils/replace-or-send-message';

type MyLocalContext = CastMyContext<{
    messageId?: number
}>

export const subscriptionScene = new Scenes.BaseScene<MyLocalContext>('SUBSCRIPTION_SCENE');

function getSubscriptionMessage(userSubscription: UserSubscription) {
    if (!userSubscription.subscriptionEnd) {
       return "You do not have an active subscription yet\\. 🕒";
    }
    const now = new Date().getTime();
    if (userSubscription.subscriptionEnd < now) {
        return "Your subscription has expired\\. ⌛";
    }
    const leftMilliseconds = userSubscription.subscriptionEnd - now;
    return `Your subscription is active\\. Time left: ${millisecondsToHumanReadable(leftMilliseconds)} ⏳`;
}

subscriptionScene.enter(async (ctx: MyLocalContext) => {
    const user = await getOrCreateUser(ctx);

    const subscriptionWalletStorage = botPerUserManager.getSubscriptionWalletStorage(user.userId);
    const subscriptionWallet = await subscriptionWalletStorage.readWallet();
    if (subscriptionWallet) {
        return await offerSubscriptions(ctx, user, subscriptionWallet);
    } else {
        return await offerToCreateWallet(ctx);
    }
});

async function offerToCreateWallet(ctx: MyLocalContext) {
    const messageText = `
First, you need to create a subscription wallet\\.
    
Then top up this wallet and choose your subscription plan\\.
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(' 💰Create Subscription Wallet', 'create_subscription_wallet')],
    ]);

    await replaceOrSendMessage(ctx, messageText, keyboard);
}

async function offerSubscriptions(ctx: MyLocalContext, user: User, subscriptionWallet: WalletData) {
    const subscriptionMessage = getSubscriptionMessage(user.subscription);
    const solBalance = await getSolBalance(subscriptionWallet.publicKey);

    const messageText = `
👥 *Your Account*:
🏦 *Subscription Wallet Address*: \`${subscriptionWallet.publicKey.toBase58()}\`
💰 *Subscription Wallet Balance*: \`${solBalance}\` SOL

🔗 *Referral Link*: \`${user.referral.referralLink}\`

🔔 *Your Subscription*:
${subscriptionMessage}

📊 *Rates*:
💸   *Weekly Subscription Price*: \`${WEEKLY_SUBSCRIPTION_PRICE_SOL}\` SOL
💸   *Monthly Subscription Price*: \`${MONTHLY_SUBSCRIPTION_PRICE_SOL}\` SOL
💎   *Lifetime Subscription Price*: \`${LIFETIME_SUBSCRIPTION_PRICE_SOL}\` SOL

Choose an option to subscribe:
    `;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('💸 Subscribe Weekly', 'subscribe_weekly')],
        [Markup.button.callback('💸 Subscribe Monthly', 'subscribe_monthly')],
        [Markup.button.callback('💎 Subscribe Lifetime', 'subscribe_lifetime')],
        [Markup.button.callback('🔙 Back', 'back_to_start')]
    ]);

    await replaceOrSendMessage(ctx, messageText, keyboard);
}

async function sendSubscriptionConfirmation(ctx: MyLocalContext, user: User, subscriptionType: string) {
    const subscriptionMessage = getSubscriptionMessage(user.subscription);

    const messageText = `
📅 *${subscriptionType} Activated\\!*

🔔 *Your Subscription Status*:
${subscriptionMessage}

Choose an option to continue:
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back', 'back_to_subscription')]
    ]);

    await replaceOrSendMessage(ctx, messageText, keyboard);
}

subscriptionScene.action('create_subscription_wallet', async (ctx: MyLocalContext) => {
    const user = await getOrCreateUser(ctx)
    const subscriptionWalletStorage = botPerUserManager.getSubscriptionWalletStorage(user.userId);
    const keypair = Keypair.generate();
    const walletData = WalletData.create(`user-subscription-wallet`, keypair);
    await subscriptionWalletStorage.saveWallet(walletData);
    await ctx.scene.enter(subscriptionScene.id, { messageId: ctx.msgId });
});

subscriptionScene.action('subscribe_weekly', async (ctx) => {
    const user = await getOrCreateUser(ctx)

    user.subscription.subscriptionEnd = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;

    await saveUser(user);
    await sendSubscriptionConfirmation(ctx, user, 'Weekly Subscription');
});

subscriptionScene.action('subscribe_monthly', async (ctx) => {
    const user = await getOrCreateUser(ctx)

    user.subscription.subscriptionEnd = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;

    await saveUser(user);
    await sendSubscriptionConfirmation(ctx, user, 'Monthly Subscription');
});

subscriptionScene.action('subscribe_lifetime', async (ctx) => {
    const user = await getOrCreateUser(ctx)

    user.subscription.subscriptionEnd = new Date('9999-12-31T23:59:59.999Z').getTime();

    await saveUser(user);
    await sendSubscriptionConfirmation(ctx, user, 'Lifetime Subscription');
});

subscriptionScene.action('back_to_start', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(startScene.id, { messageId: ctx.msgId });
});

subscriptionScene.action('back_to_subscription', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(subscriptionScene.id, { messageId: ctx.msgId });
});
