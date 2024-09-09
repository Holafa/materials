import { getUserId } from '../scenes';
import { DEFAULT_SETTINGS } from '../../settings/settings';
import { botPerUserManager } from '../main';
import { User } from './user';
import { Context } from 'telegraf';

export async function getOrCreateUser(ctx: Context): Promise<User> {
    const userId = getUserId(ctx);
    const userStorage = botPerUserManager.getUserStorage(userId);
    const existingUser = await userStorage.readUser();
    if (existingUser !== undefined) {
        return existingUser
    }
    console.log(`Creating a new user #${userId}`);
    const user: User = {
        userId,
        referral: {
            referralLink: undefined,
            referrerUserId: undefined
        },
        settings: {
            slippageBps: DEFAULT_SETTINGS.slippageBps,
            jitoTipLamports: DEFAULT_SETTINGS.jitoTipLamports,
            priorityFeeLamports: DEFAULT_SETTINGS.priorityFeeLamports
        },
        subscription: {
        }
    };
    await saveUser(user);
    return user;
}

export async function saveUser(user: User) {
    const userStorage = botPerUserManager.getUserStorage(user.userId);
    await userStorage.saveUser(user);
}