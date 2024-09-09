import { Scenes, Markup } from 'telegraf';
import { getOrCreateUser, saveUser } from '../user/get-or-create-user';
import { CastMyContext } from './types';
import { replaceOrSendMessage } from '../utils/replace-or-send-message';
import { parseEnteredAmountOrReplyWithError } from '../utils/input-utils';
import { startScene } from './start.scene';

type MyLocalContext = CastMyContext<{
    messageId?: number;
    settingType: 'slippage' | 'priorityFee' | 'jitoTips'
}>

export const settingsScene = new Scenes.BaseScene<MyLocalContext>('SETTINGS_SCENE');

const backToSettingsKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('❌ Cancel', 'back_to_settings')]
]);

settingsScene.enter(async (ctx: MyLocalContext) => {
    const user = await getOrCreateUser(ctx);
    const messageText = `🎉 Welcome to the Settings Menu\\! 🎉
    
📊 **Current Settings**:
📈 **Slippage**: \`${user.settings.slippageBps}\` BPS
💸 **Priority Fee**: \`${user.settings.priorityFeeLamports}\` lamports
💰 **Jito Tip**: \`${user.settings.jitoTipLamports}\` lamports

🌟 Use the buttons below to update these values\\. 🌟`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(`📈 Update Slippage (${user.settings.slippageBps})`, 'set_slippage')],
        [Markup.button.callback(`💸 Update Solana Priority Fee (${user.settings.priorityFeeLamports})`, 'set_priority_fee')],
        [Markup.button.callback(`💰 Update Jito Tip (${user.settings.jitoTipLamports})`, 'set_jito_tip')],
        [Markup.button.callback('🔙 Back', 'back_to_main')]
    ]);

    await replaceOrSendMessage(ctx, messageText, keyboard);
});

settingsScene.action('set_slippage', async (ctx: MyLocalContext) => {
    const messageText = '🔄 Enter the new Slippage in BPS \\(e\\.g\\. \`200\`\\):';
    ctx.scene.state.settingType = 'slippage';
    await replaceOrSendMessage(ctx, messageText, backToSettingsKeyboard);
});

settingsScene.action('set_priority_fee', async (ctx: MyLocalContext) => {
    const messageText = '🔄 Enter the new Solana Priority Fee in lamports \\(e\\.g\\. \`30000\`\\):';
    ctx.scene.state.settingType = 'priorityFee';
    await replaceOrSendMessage(ctx, messageText, backToSettingsKeyboard);
});

settingsScene.action('set_jito_tip', async (ctx: MyLocalContext) => {
    const messageText = '🔄 Enter the new Jito Tip in lamports \\(e\\.g\\. \`10000\`\\):';
    ctx.scene.state.settingType = 'jitoTips';
    await replaceOrSendMessage(ctx, messageText, backToSettingsKeyboard);
});

settingsScene.on('message', async (ctx: MyLocalContext, next) => {
    const user = await getOrCreateUser(ctx);

    const settingType = ctx.scene.state.settingType;
    const newValue = await parseEnteredAmountOrReplyWithError(ctx);
    if (newValue === undefined) {
        return;
    }

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back', 'back_to_settings')]
    ]);

    switch (settingType) {
        case 'slippage':
            user.settings.slippageBps = newValue;
            await saveUser(user);
            await replaceOrSendMessage(ctx, `✅ **Slippage** updated to \`${newValue}\` BPS`, keyboard);
            break;

        case 'priorityFee':
            user.settings.priorityFeeLamports = newValue;
            await saveUser(user);
            await replaceOrSendMessage(ctx, `✅ **Solana Priority Fee** updated to \`${newValue}\` lamports`, keyboard);
            break;

        case "jitoTips":
            user.settings.jitoTipLamports = newValue;
            await saveUser(user);
            await replaceOrSendMessage(ctx, `✅ **Jito Tip** updated to \`${newValue}\` lamports`, keyboard);
            break;

        default:
            await ctx.scene.leave();
            return next();
    }

    // Delete the user's input.
    await ctx.deleteMessage();
});

settingsScene.action('back_to_main', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(startScene.id, { messageId: ctx.msgId });
});

settingsScene.action('back_to_settings', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(settingsScene.id, { messageId: ctx.msgId });
});
