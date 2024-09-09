import { DiskStorage } from '../../storage/disk-storage';
import { User, UserId, UserSettings } from './user';
import { UserStorage } from './user-storage';

/**
 * This type is only for serializing/deserializing the user data to the file.
 */
type UserDataOnDisk = {
    userId: UserId;
    settings: UserSettings;
    referral: {
        referralLink?: string;
        referrerUserId?: UserId;
        referralCount?: number;
        referralBonuses?: number;
        referralSubscriptions?: { [userId: number]: string };
    };
    subscription: {
        subscriptionEnd?: number;
    };
    firstSubscriptionType?: string;
}

export class DiskUserStorage implements UserStorage {

    private static USER_STORAGE_KEY = 'user';

    constructor(private storage: DiskStorage) {
    }

    async readUser(): Promise<User | undefined> {
        const userDataOnDisk = await this.storage.load<UserDataOnDisk>(DiskUserStorage.USER_STORAGE_KEY);

        if (!userDataOnDisk) {
            return undefined;
        }

        return {
            userId: userDataOnDisk.userId,
            referral: {
                referralLink: userDataOnDisk.referral.referralLink,
                referrerUserId: userDataOnDisk.referral.referrerUserId,
                referralCount: userDataOnDisk.referral.referralCount,
                referralBonuses: userDataOnDisk.referral.referralBonuses,
                referralSubscriptions: userDataOnDisk.referral.referralSubscriptions,
            },
            settings: userDataOnDisk.settings,
            subscription: {
                subscriptionEnd: userDataOnDisk.subscription.subscriptionEnd
            },

        };
    }

    async saveUser(userData: User): Promise<void> {
        const userDataOnDisk: UserDataOnDisk = {
            userId: userData.userId,
            settings: userData.settings,
            subscription: {
                subscriptionEnd: userData.subscription.subscriptionEnd
            },
            referral: {
                referralLink: userData.referral.referralLink,
                referrerUserId: userData.referral.referrerUserId,
                referralCount: userData.referral.referralCount,
                referralBonuses: userData.referral.referralBonuses,
                referralSubscriptions: userData.referral.referralSubscriptions,
            },
        };

        await this.storage.save(DiskUserStorage.USER_STORAGE_KEY, userDataOnDisk);
    }
}