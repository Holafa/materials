import { CastMyContext } from "../types";
import { Markup, Scenes } from 'telegraf';
import { getOrCreateUser } from '../../user/get-or-create-user';
import { botPerUserManager } from '../../main';
import { handleAddDevWallet } from '../../../handlers';
import { getBase58ByKeypair } from '../../../utils/keypair-utils';
import { walletScene } from './wallet.scene';
import { replaceOrSendMessage } from '../../utils/replace-or-send-message';

export type MyLocalContext = CastMyContext<{
    messageId?: number;
}>;

const backButton = Markup.inlineKeyboard([
    Markup.button.callback('🔙 Back', 'back_to_wallets')
]);

export const createDevWalletScene = new Scenes.BaseScene<MyLocalContext>('CREATE_DEV_WALLET_SCENE');

createDevWalletScene.enter(async (ctx) => {
    const user = await getOrCreateUser(ctx);
    const walletStorage = botPerUserManager.getWalletStorage(user.userId);

    try {
        const wallets = await walletStorage.readWallets();
        const existingDevWallet = wallets.devWallet;
        if (existingDevWallet) {
            const messageText = '⚠️ You already have a dev wallet\\.\n\nClick \\"Back\\" to manage your wallets\\.';
            await replaceOrSendMessage(ctx, messageText, backButton);
        } else {
            const devWallet = await handleAddDevWallet(walletStorage);
            const messageText = `✅ Dev wallet created successfully\\!
    
*Public Key:* \`${devWallet.publicKey.toBase58()}\`
*Private Key:* \`${(getBase58ByKeypair(devWallet.keypair))}\``;
            await replaceOrSendMessage(ctx, messageText, backButton);
        }
    } catch (error) {
        console.error('Error creating dev wallet:', error);
        await replaceOrSendMessage(ctx, '❌ Failed to create dev wallet\\. Please try again later\\.', backButton);
    }
});

createDevWalletScene.action('back_to_wallets', async (ctx: MyLocalContext) => {
    await ctx.scene.enter(walletScene.id, { messageId: ctx.msgId });
});
