import { Markup, Scenes } from 'telegraf';
import { allCommands } from './index';
import { getOrCreateUser, saveUser } from '../user/get-or-create-user';
import { extractReferrerId, generateReferralLink } from '../referrals/referal-link';
import { walletScene } from './wallet/wallet.scene';
import { tokenScene } from './token/token.scene';
import { CastMyContext } from './types';
import { subscriptionScene } from './subscription/subscription.scene';
import { settingsScene } from './settings.scene';
import { referralScene } from "./referral.scene";
import { replaceOrSendMessage } from '../utils/replace-or-send-message';

type MyLocalContext = CastMyContext<{
  messageId?: number
}>


export const startScene = new Scenes.BaseScene<MyLocalContext>('START_SCENE');

const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('💸 Subscription Manager', 'enter_subscription_scene')],
  [Markup.button.callback('💼 Wallet Manager', 'enter_wallet_scene')],
  [Markup.button.callback('🪙 Token Manager', 'enter_token_manager')],
  [Markup.button.callback('👨‍💼 Referral Manager', 'enter_referral_scene')],
  [Markup.button.callback('⚙️ Settings', 'enter_settings_scene')],
])

startScene.enter(async (ctx) => {
  const user = await getOrCreateUser(ctx);

  const referrerUserId = extractReferrerId(ctx);
  const referralLink = await generateReferralLink(ctx, user);

  user.referral = {
    referrerUserId,
    referralLink
  };
  await saveUser(user);

  await ctx.telegram.setMyCommands(allCommands);

  const firstName = ctx.from!.first_name;
  const messageText = `Hey ${firstName}\\! 🚀
This bot helps you launch and manage your own token on Pump Fun while protecting you from sniper bots\\. 💎

Explore the options below and start managing your tokens\\! If you need help, press the menu button and select /help\\. 🌟`;

  await replaceOrSendMessage(ctx, messageText, mainMenu);
});

startScene.action('enter_subscription_scene', async (ctx: MyLocalContext) => {
  await ctx.scene.enter(subscriptionScene.id, { messageId: ctx.msgId });
});

startScene.action('enter_wallet_scene', async (ctx) => {
  await ctx.scene.leave();
  await ctx.scene.enter(walletScene.id, { messageId: ctx.msgId });
});

startScene.action('enter_token_manager', async (ctx) => {
  await ctx.scene.leave();
  await ctx.scene.enter(tokenScene.id, { messageId: ctx.msgId });
});

startScene.action('enter_referral_scene', async (ctx: MyLocalContext) => {
  await ctx.scene.enter(referralScene.id, { messageId: ctx.msgId });
});

startScene.action('enter_settings_scene', async (ctx: MyLocalContext) => {
  await ctx.scene.enter(settingsScene.id, { messageId: ctx.msgId });
});
