import { getEnvVariable } from '../../../config';

export const WEEKLY_SUBSCRIPTION_PRICE_SOL = parseFloat(getEnvVariable("WEEKLY_SUBSCRIPTION_PRICE_SOL"));
export const MONTHLY_SUBSCRIPTION_PRICE_SOL = parseFloat(getEnvVariable("MONTHLY_SUBSCRIPTION_PRICE_SOL"));
export const LIFETIME_SUBSCRIPTION_PRICE_SOL = parseFloat(getEnvVariable("LIFETIME_SUBSCRIPTION_PRICE_SOL"));