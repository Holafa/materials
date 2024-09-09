import { UxMessageStream } from '../../ux-message/ux-message-stream';
import { UxMessage } from '../../ux-message/ux-message';
import { Context } from 'telegraf';

export class TelegramUxMessageStream implements UxMessageStream {
    constructor(
        private readonly ctx: Context
    ) {
    }

    async sendMessage(message: UxMessage): Promise<void> {
        const markdownV2 = message.toMarkdownV2();
        await this.ctx.replyWithMarkdownV2(markdownV2, {
            link_preview_options: {
                is_disabled: true
            }
        });
    }
}