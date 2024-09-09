import { Markup, Scenes } from 'telegraf';
import { CastMyContext } from "./types";
import { getOrCreateUser, saveUser } from '../user/get-or-create-user';
import { countReferralsWithFirstSubscription, calculateReferralBonus} from '../referrals/referral-bonus';
import { isValidWalletAddress } from '../../utils/wallet-utils';
import { startScene } from './start.scene';
import { getTextMessage } from './index';
import { replaceOrSendMessage } from '../utils/replace-or-send-message';
import { CONFIG } from '../../config';

type MyLocalContext = CastMyContext<{
    messageId?: number;
    bonusWithdrawalAddress?: string;
    withdrawalAmount?: number;
}>;

const cancelButton = Markup.inlineKeyboard([
    Markup.button.callback('❌ Cancel', 'cancel_withdrawal')
]);

const backButton = Markup.inlineKeyboard([
    Markup.button.callback('🔙 Back', 'back_to_main')
]);

export const referralScene = new Scenes.BaseScene<MyLocalContext>('REFERRAL_SCENE');

referralScene.enter(async (ctx: MyLocalContext) => {
    const user = await getOrCreateUser(ctx);

    user.bonusBalance = await calculateReferralBonus(user.userId);
    await saveUser(user);

    const referralCount = user.referral.referralCount || 0;
    const referralsWithSubscription = await countReferralsWithFirstSubscription(user.userId);


    const referralMessage = `
👋 Welcome to the Referral Manager

📢 *Your Account*:
🔗 *Referral Link*: \`${user.referral.referralLink}\`
👥 *Number of Referrals*: ${referralCount}
📈 *Number of Referrals with Subscription*: ${referralsWithSubscription}
💰 *Bonus Balance*: ${user.bonusBalance || 0} SOL

Choose an option below:
    `;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('💸 Withdraw Bonus', 'withdraw_bonus')],
        [Markup.button.callback('🔙 Back', 'back_to_main')],
    ]);

    await replaceOrSendMessage(ctx, referralMessage, keyboard);
});

referralScene.action('withdraw_bonus', async (ctx: MyLocalContext) => {
    await replaceOrSendMessage(ctx, '🎃 Please enter your withdrawal address:', cancelButton);

});

referralScene.on('message', async (ctx: MyLocalContext) => {
    const input = getTextMessage(ctx);

    if (!ctx.scene.state.bonusWithdrawalAddress) {
        if (isValidWalletAddress(input)) {
            ctx.scene.state.bonusWithdrawalAddress = input;
            await replaceOrSendMessage(ctx, '💸 Now please enter the amount you want to withdraw:', cancelButton);
            await ctx.deleteMessage();
            return;
        } else {
            await replaceOrSendMessage(ctx, '❌ Invalid wallet address\\. Please enter a valid wallet address:', cancelButton);
            await ctx.deleteMessage();
            return;
        }
    }

    if (!ctx.scene.state.withdrawalAmount) {
        const amount = parseFloat(input);
        if (isNaN(amount) || amount <= 0) {
            await replaceOrSendMessage(ctx, '❌ Please enter a valid withdrawal amount:', cancelButton);
            await ctx.deleteMessage();
            return;
        }

        const user = await getOrCreateUser(ctx);
        if ((user.bonusBalance ?? 0) >= amount) {
            user.bonusBalance = (user.bonusBalance ?? 0) - amount;
            await saveUser(user);
            await replaceOrSendMessage(ctx, '✅ Your withdrawal request has been successfully created\\. Please wait for the processing of your request\\. You will definitely receive feedback\\. 🕒📩', backButton);
            await ctx.telegram.sendMessage(CONFIG.NOTIFICATION_CHAT_ID, `User ${user.userId} has submitted a withdrawal request for ${amount} SOL.`);
        } else {
            await replaceOrSendMessage(ctx, '❌ You do not have enough bonus balance to withdraw this amount\\.', backButton);
        }
        await ctx.deleteMessage();
    }
});


referralScene.action('back_to_main', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(startScene.id, { messageId: ctx.msgId });
});