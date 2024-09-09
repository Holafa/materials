import { CastMyContext } from '../scenes/types';
import type { InlineKeyboardMarkup } from '@telegraf/types/markup';
import { Markup } from 'telegraf';

export type ContextWithMessageId = CastMyContext<{
  messageId?: number
}>

export async function deleteAndSendNewMessage(
  ctx: ContextWithMessageId,
  messageText: string,
  inlineKeyboardMarkup?: Markup.Markup<InlineKeyboardMarkup>
) {
  const messageId = ctx.scene.state.messageId;
  if (messageId) {
    await ctx.deleteMessage(messageId);
  }
  const linkPreviewOptions = {
    is_disabled: true
  };
  const message = await ctx.replyWithMarkdownV2(messageText, {
    reply_markup: inlineKeyboardMarkup?.reply_markup,
    ...linkPreviewOptions
  });
  ctx.scene.state.messageId = message.message_id;
}