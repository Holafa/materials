import { Markup, Scenes } from 'telegraf';
import { CastMyContext } from "../types";
import { createTokenScene } from './create-token.scene';
import { replaceOrSendMessage } from "../../utils/replace-or-send-message";
import { startScene } from "../start.scene";
import { botPerUserManager } from '../../main';
import { getOrCreateUser } from '../../user/get-or-create-user';
import { sellTokenScene } from './sell-token.scene';

export type MyLocalContext = CastMyContext<{
  messageId?: number;
}>;

export const tokenScene = new Scenes.BaseScene<MyLocalContext>('TOKEN_SCENE');

export const tokenScenes = [
  tokenScene,
  createTokenScene,
  sellTokenScene
];

tokenScene.enter(async (ctx: MyLocalContext) => {
  const user = await getOrCreateUser(ctx);
  const tokenStorage = botPerUserManager.getTokenStorage(user.userId);
  const token = await tokenStorage.readToken();
  if (!token) {
    const messageText = `
🪙 Welcome to the Token Manager:

🎃 Please choose an action:`;
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('💊 Create a new token', 'create_token')],
      [Markup.button.callback('🔙 Back', 'back_to_main')],
    ]);

    await replaceOrSendMessage(ctx, messageText, keyboard);
    return;
  }

  const metadata = token.metadata;
  const mintAddress = token.mint.toBase58();
  const messageText = `
💼 Welcome to the Token Manager:

ℹ️ Here is the information about your issued token:
🏷️ *Token Name*: \`${metadata.name}\`
🏷️ *Token Symbol*: \`${metadata.symbol}\`
📜 *Token Contract*: \`${mintAddress}\`

[Pumpfun](https://pump.fun/${mintAddress}) \\| [Photon](https://photon-sol.tinyastro.io/en/lp/${mintAddress}) \\| [DexScreener](https://dexscreener.com/solana/${mintAddress})

🎃 Please choose an action:`;

  // TODO[UX]: allow to remove the existing token.
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🪙 Sell token', 'sell_token')],
    [Markup.button.callback('🔙 Back', 'back_to_main')],
  ]);

  await replaceOrSendMessage(ctx, messageText, keyboard);
});

tokenScene.action('create_token', async (ctx: MyLocalContext) => {
  await ctx.scene.enter(createTokenScene.id, { messageId: ctx.msgId });
});

tokenScene.action('sell_token', async (ctx: MyLocalContext) => {
  await ctx.scene.enter(sellTokenScene.id, { messageId: ctx.msgId });
});

tokenScene.action('back_to_main', async (ctx: MyLocalContext) => {
  await ctx.scene.enter(startScene.id, { messageId: ctx.msgId });
});