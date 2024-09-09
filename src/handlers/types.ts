import { WalletData } from '../wallet/types';

export type BuyPlan = {
    wallet: WalletData;
    /**
     * This is the total amount of SOL (lamports) to be spent on the buy transaction.
     * It includes the Pump.Fun fee and the Associate Token Account rent cost.
     */
    buySolLamportsPowerAmount: bigint
}[]