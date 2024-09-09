import { session, Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { MyContext } from '../types';
import { botStage } from '../scenes';
import { walletScene } from '../scenes/wallet/wallet.scene';
import { startScene } from '../scenes/start.scene';
import { helpScene } from '../scenes/help.scene';
import { settingsScene } from '../scenes/settings.scene';
import { tokenScene } from '../scenes/token/token.scene';
import { subscriptionScene } from '../scenes/subscription/subscription.scene';

dotenv.config();

export const bot = new Telegraf<MyContext>(
    process.env.TELEGRAM_BOT_TOKEN || ''
);

bot.use(session());
bot.use(botStage.middleware());
bot.start((ctx) => ctx.scene.enter(startScene.id));
bot.help((ctx) => ctx.scene.enter(helpScene.id));
bot.settings((ctx) => ctx.scene.enter(settingsScene.id));
bot.command('subscription', (ctx) => ctx.scene.enter(subscriptionScene.id));
bot.command('token', (ctx) => ctx.scene.enter(tokenScene.id));
bot.command('wallet', (ctx) => ctx.scene.enter(walletScene.id));
bot.use(async (ctx) => {
    console.log('User ended up in the default context, redirecting to the start scene');
    await ctx.scene.enter(startScene.id);
})
bot.catch((err, ctx) => {
    console.error('Unknown error occurred.', err, ctx);
    // TODO[architecture]: decide to rethrow or not, better to rethrow for now.
    throw err;
})