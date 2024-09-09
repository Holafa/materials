import { Scenes } from 'telegraf';
import { MyContext } from '../types';

export const helpScene = new Scenes.BaseScene<MyContext>('HELP_SCENE');

helpScene.enter(async (ctx) => {
    const helpMessage = `
    🤖 *Welcome to the Bot Help Menu\\!*

Main Menu Overview:
🔍 Quick access to all major functions of the bot\\.
Use: /start

Subscription Manager:
📅 Manage and select your subscription plans\\.
Use: /subscription

Wallet Manager:
💼 Create and manage wallets, and handle SOL distribution\\.
Use: /wallet

Token Manager:
🪙 Create, buy, and manage your tokens\\.
Use: /token

Settings Menu:
⚙️ Adjust transaction fees, slippage, and tips\\.
Use: /settings

For detailed information, check our [GitBook](https://bvch.gitbook.io/x-safelaunch)\\! 📚
    `;

    await ctx.replyWithMarkdownV2(helpMessage);
    await ctx.scene.leave();
})

helpScene.command('exit', async (ctx) => {
    await ctx.scene.leave();
});
