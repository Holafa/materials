import { UserId } from '../user/user';
import { WalletStorage } from '../../wallet/wallet-storage';
import { UserStorage } from '../user/user-storage';
import { TokenStorage } from '../../token/token-storage';
import { SubscriptionWalletStorage } from '../subscription/subscription-wallet-storage';

export interface BotPerUserManager {
    getUserStorage(userId: UserId): UserStorage;

    getWalletStorage(userId: UserId): WalletStorage;

    getTokenStorage(userId: UserId): TokenStorage;

    getSubscriptionWalletStorage(userId: UserId): SubscriptionWalletStorage;
}