import { UserId } from '../user/user';
import { saveUser } from '../user/get-or-create-user';
import { botPerUserManager } from '../main';
import { WEEKLY_SUBSCRIPTION_PRICE_SOL, MONTHLY_SUBSCRIPTION_PRICE_SOL, LIFETIME_SUBSCRIPTION_PRICE_SOL } from '../scenes/subscription/subscription-price';
import fs from 'fs/promises';
import { CONFIG } from '../../config';

async function getAllUserIds(): Promise<UserId[]> {
    const baseStoragePath = CONFIG.STORAGE_PATH;
    try {
        const directories = await fs.readdir(baseStoragePath);
        const userIds: UserId[] = directories
            .filter(dir => !isNaN(Number(dir)))
            .map(dir => Number(dir));
        return userIds;
    } catch (error) {
        console.error("Error reading user IDs:", error);
        return [];
    }
}

export async function countReferrals(userId: UserId): Promise<number> {
    const userStorage = botPerUserManager.getUserStorage(userId);
    const currentUser = await userStorage.readUser();
    if (!currentUser) return 0;

    let referralCount = 0;
    const allUserIds = await getAllUserIds();
    for (const otherUserId of allUserIds) {
        const otherUserStorage = botPerUserManager.getUserStorage(otherUserId);
        const otherUser = await otherUserStorage.readUser();
        if (otherUser && otherUser.referral.referrerUserId === userId) {
            referralCount++;
        }
    }

    return referralCount;
}

export async function countReferralsWithFirstSubscription(userId: UserId): Promise<number> {
    const allUserIds = await getAllUserIds();
    let referralCount = 0;

    for (const otherUserId of allUserIds) {
        const otherUserStorage = botPerUserManager.getUserStorage(otherUserId);
        const otherUser = await otherUserStorage.readUser();
        if (otherUser && otherUser.referral.referrerUserId === userId) {
            const firstSubscriptionType = otherUser.referral.firstSubscriptionType;
            if (firstSubscriptionType) {
                referralCount++;
            }
        }
    }

    return referralCount;
}

export async function calculateReferralBonus(userId: UserId): Promise<number> {
    const userStorage = botPerUserManager.getUserStorage(userId);
    const currentUser = await userStorage.readUser();
    if (!currentUser) return 0;

    let totalBonus = 0;
    const allUserIds = await getAllUserIds();

    for (const otherUserId of allUserIds) {
        const otherUserStorage = botPerUserManager.getUserStorage(otherUserId);
        const otherUser = await otherUserStorage.readUser();
        if (otherUser && otherUser.referral.referrerUserId === userId) {
            const firstSubscriptionType = otherUser.referral.firstSubscriptionType;
            if (firstSubscriptionType) {
                let bonus = 0;
                switch (firstSubscriptionType) {
                    case 'Weekly':
                        bonus = WEEKLY_SUBSCRIPTION_PRICE_SOL * CONFIG.BONUS_PERCENTAGE;
                        break;
                    case 'Monthly':
                        bonus = MONTHLY_SUBSCRIPTION_PRICE_SOL * CONFIG.BONUS_PERCENTAGE;
                        break;
                    case 'Lifetime':
                        bonus = LIFETIME_SUBSCRIPTION_PRICE_SOL * CONFIG.BONUS_PERCENTAGE;
                        break;
                }
                totalBonus += bonus;
            }
        }
    }

    currentUser.bonusBalance = totalBonus;
    await saveUser(currentUser);

    return totalBonus;
}

