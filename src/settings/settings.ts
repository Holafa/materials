import { PriorityFeeLamports } from '../transaction/priority-fee';

export interface Settings {
    slippageBps: number;
    jitoTipLamports: number;
    priorityFeeLamports: PriorityFeeLamports;
}

export const DEFAULT_SETTINGS: Settings = {
    slippageBps: 300,
    jitoTipLamports: 30000,
    priorityFeeLamports: 30000,
}