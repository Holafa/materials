import { CastMyContext } from '../scenes/types';
import type { InlineKeyboardMarkup } from '@telegraf/types/markup';
import { Markup, TelegramError } from 'telegraf';

export type ContextWithMessageId = CastMyContext<{
  messageId?: number
}>

export async function replaceOrSendMessage(
  ctx: ContextWithMessageId,
  messageText: string,
  inlineKeyboardMarkup?: Markup.Markup<InlineKeyboardMarkup>
) {
  const messageId = ctx.scene.state.messageId;
  const linkPreviewOptions = {
    is_disabled: true
  };
  if (messageId) {
    // TODO[architecture]: in a rare event, the message and markup of the new message are exactly the same,
    //  in which case the Telegram API throws an exception
    //  """TelegramError: 400: Bad Request: message is not modified: specified new message content
    //     and reply markup are exactly the same as a current content and reply markup of the message"""
    try {
      await ctx.telegram.editMessageText(ctx.chat!.id, messageId, undefined, messageText, {
        reply_markup: inlineKeyboardMarkup?.reply_markup,
        parse_mode: "MarkdownV2",
        ...linkPreviewOptions
      });
    } catch (e) {
      if (e instanceof TelegramError && e.code === 400 && e.description.includes("message is not modified")) {
        return;
      }
      throw e;
    }
  } else {
    const message = await ctx.replyWithMarkdownV2(messageText, {
      reply_markup: inlineKeyboardMarkup?.reply_markup,
      ...linkPreviewOptions
    });
    ctx.scene.state.messageId = message.message_id;
  }
}