import { Context, Scenes } from 'telegraf';
import { startScene } from './start.scene';
import { settingsScene } from './settings.scene';
import { MyContext } from '../types';
import { helpScene } from './help.scene';
import { walletScenes } from './wallet/wallet.scene';
import { BaseScene } from 'telegraf/scenes';
import { tokenScenes } from './token/token.scene';
import { subscriptionScene } from './subscription/subscription.scene';
import { referralScene } from "./referral.scene";

export const allCommands = [
    {
        command: '/start',
        description: 'Start the bot',
    },
    {
        command: '/help',
        description: 'Read the help menu',
    },
    {
        command: '/settings',
        description: 'Configure the bot',
    },
    {
        command: '/subscription',
        description: 'Manage subscription',
    },
    {
        command: '/token',
        description: 'Launch new tokens',
    },
    {
        command: '/wallet',
        description: 'Manage wallets',
    },
    {
        command: '/comments',
        description: 'Manage comments',
    },
]

const botScenes: ReadonlyArray<BaseScene<MyContext>> = [
    startScene,
    helpScene,
    settingsScene,
    referralScene,
    subscriptionScene,
    ...tokenScenes,
    ...walletScenes
].map((scene) => scene as any as BaseScene<MyContext>);

export const botStage = new Scenes.Stage<MyContext>(botScenes);

// TODO[architecture]: we need to find a recommended way to process text messages.
export function getTextMessage(ctx: Context): string {
    return (ctx.message! as any).text!.trim()
}


export function getUserId(ctx: Context): number {
    const userId = ctx.from?.id;
    if (!userId) {
        throw new Error(`Unknown user ID for context ${JSON.stringify(ctx)}`);
    }
    return userId;
}