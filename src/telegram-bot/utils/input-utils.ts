import { Markup } from 'telegraf';
import { getTextMessage } from '../scenes';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { ContextWithMessageId, replaceOrSendMessage } from './replace-or-send-message';
import type { InlineKeyboardMarkup } from '@telegraf/types/markup';

type NumberInputOptions = {
    allowZero?: boolean,
    min?: number,
    max?: number,
    extraReply?: ExtraReplyMessage,
    inlineKeyboardMarkup?: Markup.Markup<InlineKeyboardMarkup>
};

function validate(amount: number, options: NumberInputOptions) {
    // Check if the amount is NaN, less than 0, or zero when zero is not allowed
    if (isNaN(amount) || amount < 0 || (amount === 0 && !options.allowZero)) {
        return '❌ Invalid amount. Please enter a valid number:';
    }

    if (options.min !== undefined && amount < options.min) {
        return `❌ Amount must be at least ${options.min}. Please enter a valid number:`;
    }

    if (options.max !== undefined && amount > options.max) {
        return `❌ Amount must not exceed ${options.max}. Please enter a valid number:`;
    }

    return undefined;
}

export async function parseEnteredAmountOrReplyWithError(
  ctx: ContextWithMessageId,
  options: NumberInputOptions = {}
): Promise<number | undefined> {
    const amount = parseFloat(getTextMessage(ctx));
    const errorMessage = validate(amount, options);
    if (errorMessage) {
        await replaceOrSendMessage(ctx, errorMessage, options.inlineKeyboardMarkup)
        await ctx.deleteMessage();
        return undefined;
    }
    return amount;
}
