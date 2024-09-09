import { JsonFileDiskStorage } from '../../storage/json-disk-storage';
import { UserId } from '../user/user';
import path from 'path';
import { UserStorage } from '../user/user-storage';
import { DiskUserStorage } from '../user/disk-user-storage';
import { WalletStorage } from '../../wallet/wallet-storage';
import { DiskWalletStorage } from '../../wallet/disk-wallet-storage';
import { TokenStorage } from '../../token/token-storage';
import { DiskTokenStorage } from '../../token/disk-token-storage';
import { BotPerUserManager } from './bot-per-user-manager';
import { SubscriptionWalletStorage } from '../subscription/subscription-wallet-storage';
import { DiskSubscriptionWalletStorage } from '../subscription/disk-subscription-wallet-storage';

export class DiskBotPerUserManager implements BotPerUserManager {
    constructor(private readonly baseStoragePath: string) {
    }

    private getUserDiskStorage(userId: UserId): JsonFileDiskStorage {
        const userDiskStoragePath = path.join(this.baseStoragePath, userId.toString());
        return new JsonFileDiskStorage(userDiskStoragePath);
    }

    getUserStorage(userId: UserId): UserStorage {
        return new DiskUserStorage(this.getUserDiskStorage(userId));
    }

    getWalletStorage(userId: UserId): WalletStorage {
        return new DiskWalletStorage(this.getUserDiskStorage(userId));
    }

    getTokenStorage(userId: UserId): TokenStorage {
        return new DiskTokenStorage(this.getUserDiskStorage(userId));
    }

    getSubscriptionWalletStorage(userId: UserId): SubscriptionWalletStorage {
        return new DiskSubscriptionWalletStorage(this.getUserDiskStorage(userId));
    }
}