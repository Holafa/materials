import { Markup, Scenes } from 'telegraf';
import { CastMyContext } from "../types";
import { replaceOrSendMessage } from "../../utils/replace-or-send-message";
import { botPerUserManager } from '../../main';
import { getOrCreateUser } from '../../user/get-or-create-user';
import { tokenScene } from './token.scene';
import { buildSellPlanToSellAllAvailableTokensOnDevAndBuyWallets, handleSell, SellPlan } from '../../../handlers/sell';
import { TelegramUxMessageStream } from '../../ux-message/TelegramUxMessageStream';

export type MyLocalContext = CastMyContext<{
  messageId?: number;
  // TODO[architecture]: make this JSON serializable to support the session storage.
  sellPlan?: SellPlan;
}>;

export const sellTokenScene = new Scenes.BaseScene<MyLocalContext>('SELL_TOKEN_SCENE');

sellTokenScene.enter(async (ctx: MyLocalContext) => {
  const user = await getOrCreateUser(ctx);
  const tokenStorage = botPerUserManager.getTokenStorage(user.userId);
  const token = await tokenStorage.readToken();
  if (!token) {
    // TODO[UX]: show a message that the token does not exist yet.
    await ctx.scene.enter(tokenScene.id, { messageId: ctx.msgId });
    return;
  }

  const walletStorage = botPerUserManager.getWalletStorage(user.userId);
  const { buyWallets} = await walletStorage.readWallets();
  const devWallet = await walletStorage.getDevWallet();
  const sellPlan: SellPlan = await buildSellPlanToSellAllAvailableTokensOnDevAndBuyWallets(devWallet, buyWallets, tokenStorage);
  ctx.scene.state.sellPlan = sellPlan;

  let confirmationMessage = '📊 *Sell Plan:*\n\n';
  sellPlan.forEach(({ wallet: sellWallet, amountToSell}) => {
    confirmationMessage += `${sellWallet.toMarkdownV2()} will sell \`${(amountToSell.uiAmount)}\` of the token \`${token.mint.toBase58()}\`\n`;
  });

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Confirm', 'confirm_sell')],
    [Markup.button.callback('❌ Cancel', 'back_to_token_scene')],
  ]);

  // TODO[UX]: allow to remove the existing token.
  await replaceOrSendMessage(ctx, confirmationMessage, keyboard);
});

sellTokenScene.action('confirm_sell', async (ctx: MyLocalContext) => {
  const sellPlan = ctx.scene.state.sellPlan;
  if (!sellPlan) {
    await ctx.scene.enter(tokenScene.id, { messageId: ctx.msgId });
    return;
  }

  const user = await getOrCreateUser(ctx);
  const tokenStorage = botPerUserManager.getTokenStorage(user.userId);
  const walletStorage = botPerUserManager.getWalletStorage(user.userId);

  await handleSell(walletStorage, tokenStorage, user.settings, sellPlan, new TelegramUxMessageStream(ctx));
});

sellTokenScene.action('back_to_token_scene', async (ctx: MyLocalContext) => {
  await ctx.scene.enter(tokenScene.id, { messageId: ctx.msgId });
});