export interface UserSettings {
    slippageBps: number;
    jitoTipLamports: number;
    priorityFeeLamports: number;
}


export type UserId = number;

export type PosixTimestamp = number;

export interface UserSubscription {
    subscriptionEnd?: PosixTimestamp;
}

export interface UserReferral {
    referralLink?: string;
    referrerUserId?: UserId;
    referralCount?: number;
    referralBonuses?: number;
    referralSubscriptions?: { [userId: number]: string };
    firstSubscriptionType?: string;
}

export interface User {
    userId: UserId;
    settings: UserSettings;
    referral: UserReferral;
    subscription: UserSubscription;
    bonusBalance?: number;
}