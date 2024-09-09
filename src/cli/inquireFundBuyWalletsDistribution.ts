import { WalletStorage } from '../wallet/wallet-storage';
import { getSolBalance } from '../balances/balancemanager';
import inquirer from 'inquirer';
import { FundBuyWalletsDistribution } from '../handlers/fundBuyWallets';

export async function inquireFundBuyWalletsDistribution(
    mode: 'manual' | 'automatic',
    walletStorage: WalletStorage
): Promise<FundBuyWalletsDistribution> {
    const { devWallet, buyWallets } = await walletStorage.readWallets();
    if (!devWallet) {
        return [];
    }
    if (buyWallets.length === 0) {
        return [];
    }
    if (mode === 'automatic') {
        const devWalletFunds = await getSolBalance(devWallet.publicKey);
        // TODO[UX]: do not require this env variable.
        const remainingFunds = Number(process.env.REMAINING_FUNDS);
        if (isNaN(remainingFunds) || remainingFunds <= 0) {
            console.error('❌ Invalid REMAINING_FUNDS value in .env');
            return [];
        }
        if (devWalletFunds < remainingFunds) {
            console.error(`Dev wallet balance ${devWalletFunds} is less than the specified REMAINING_FUNDS ${remainingFunds}`);
            return [];
        }
        // TODO[UX]: generate N random numbers that sum up to S, approve this distribution from the user.
        const model = [0.5115, 0.4901, 0.6861, 0.735, 0.8822, 1.0782, 1.1762, 1.8624,
            1.3723, 1.7644, 1.5683, 2.4505, 2.2545, 1.9604, 2.1564, 2.5485,
            2.9579, 2.6465, 2.8775, 3.0386, 4.2149, 4.9010, 3.4307, 1.6331,
            1.5600, 1.9604];
        const fundsToDistribute = devWalletFunds - 0.1;
        const relevantModel = model.slice(0, buyWallets.length);
        const sumOfWeights = relevantModel.reduce((acc, weight) => acc + weight, 0);
        return buyWallets.map((buyWallet, index) => ({
            buyWallet,
            amount: (relevantModel[index] / sumOfWeights) * fundsToDistribute
        }))
    } else {
        const distribution: FundBuyWalletsDistribution = [];
        for (let index = 0; index < buyWallets.length; index++) {
            const wallet = buyWallets[index];
            const input = await inquirer.prompt<{ amount: number }>([{
                type: 'input',
                name: 'amount',
                message: `Enter the amount of SOL to distribute to BuyWallet ${index + 1} (${wallet.name}):`,
                validate: input => !isNaN(Number(input)) && Number(input) > 0 ? true : 'Please enter a valid number greater than 0'
            }]);
            distribution.push({
                buyWallet: wallet,
                amount: input.amount
            });
        }
        return distribution;
    }
}