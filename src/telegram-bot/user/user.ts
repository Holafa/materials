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
}

export interface User {
    userId: UserId;
    settings: UserSettings;
    referral: UserReferral;
    subscription: UserSubscription;
}