import { Context } from 'telegraf';
import { User } from '../user/user';

export async function generateReferralLink(ctx: Context, user: User): Promise<string> {
    const botInfo = await ctx.telegram.getMe();
    return `https://t.me/${botInfo.username}?start=${user.userId}`;
}

export function extractReferrerId(ctx: Context): number | undefined {
    const payload = (ctx as any).payload;
    if (payload && Number(payload)) {
        return Number(payload);
    }
    return undefined;
}