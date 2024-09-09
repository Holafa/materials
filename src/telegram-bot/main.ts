import { bot } from './bot';
import { CONFIG } from '../config';

import { DiskBotPerUserManager } from './manager/disk-bot-per-user-manager';

export const botPerUserManager = new DiskBotPerUserManager(CONFIG.STORAGE_PATH);

async function main() {
    const botInfo = await bot.telegram.getMe();

    const awaitBot = bot.launch(() => {
        console.log(`Bot @${botInfo.username} started.`);
    });

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    await awaitBot;
}

main().catch(console.error);
