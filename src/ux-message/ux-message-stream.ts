import { UxMessage } from './ux-message';

export interface UxMessageStream {
    sendMessage(message: UxMessage): Promise<void>;
}

export class ConsoleMessageStream implements UxMessageStream {
    async sendMessage(message: UxMessage): Promise<void> {
        console.log(message.toMarkdownV2());
    }
}
