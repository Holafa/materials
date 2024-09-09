import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { PumpFunSDK, TOTAL_COST_PAID_BY_CREATOR_WALLET_LAMPORTS } from '../pump-fun/pump-fun-sdk';
import { BuiltTransaction } from '../transaction/built-transaction';
import { connection } from '../rpc-connection';
import {
  createAtaTransaction,
  RENT_FEE_OF_ASSOCIATED_TOKEN_ACCOUNT_LAMPORTS
} from '../transaction/token/create-ata-transaction';
import { BondingCurveAccount } from '../pump-fun/bondingCurveAccount';
import { WalletStorage } from '../wallet/wallet-storage';
import { Settings } from '../settings/settings';
import { TokenStorage } from '../token/token-storage';
import { BuyPlan } from './types';
import { getLamportsBalance } from '../balances/balancemanager';
import { WalletData } from '../wallet/types';
import { getTotalTransactionFeeLamports } from '../transaction/priority-fee';
import { MINIMUM_LAMPORTS_BALANCE_TO_KEEP_ON_A_WALLET_FOR_UNEXPECTED_EXPENSES } from '../transaction/constants';

export type BuyTransaction = {
  buyer: PublicKey;
  createBuyerAtaTransaction: BuiltTransaction;
  buyTokenTransaction: BuiltTransaction
}

export async function createBuyTransactions(
  mint: PublicKey,
  bondingCurveAccount: BondingCurveAccount,
  buyPlan: BuyPlan,
  slippageBps: number
): Promise<BuyTransaction[]> {
  const pumpFunSdk = await PumpFunSDK.create(connection);
  const buyTokenTransactions: BuyTransaction[] = [];

  for (const { wallet: buyWallet, buySolLamportsPowerAmount } of buyPlan) {
    const createBuyerAtaTransaction = createAtaTransaction(buyWallet.keypair, mint);

    const buySolLamportsPowerAmountAfterRent = buySolLamportsPowerAmount - RENT_FEE_OF_ASSOCIATED_TOKEN_ACCOUNT_LAMPORTS;
    const buySolLamportsEffectiveAmount = PumpFunSDK.calculateEffectiveBuySolLamportsAmount(buySolLamportsPowerAmountAfterRent);

    const { buyTransaction: buyTokenTransaction, simulatedBuyResult } =
      await pumpFunSdk.createBuyTransaction(bondingCurveAccount, buyWallet.keypair, mint, buySolLamportsEffectiveAmount, slippageBps);
    bondingCurveAccount = simulatedBuyResult.newCurve;

    buyTokenTransactions.push({
      buyer: buyWallet.publicKey,
      createBuyerAtaTransaction,
      buyTokenTransaction
    });
  }

  return buyTokenTransactions
}

export async function calculateBuyAmountPowerLamportsOfWallet(
  wallet: WalletData,
  isDevWallet: boolean,
  settings: Settings
) {
  const walletBalanceLamports = BigInt(await getLamportsBalance(wallet.publicKey));

  let lamportsToKeep = 0n;
  if (isDevWallet) {
    // The dev wallet pays the Jito tip both to buy and sell tokens.
    lamportsToKeep += 2n * BigInt(settings.jitoTipLamports);

    lamportsToKeep += TOTAL_COST_PAID_BY_CREATOR_WALLET_LAMPORTS;
  }

  // Keep enough fees to pay for at least 2 transfer transactions.
  lamportsToKeep += 2n * BigInt(getTotalTransactionFeeLamports(settings.priorityFeeLamports,1))

  // Keep enough fees to be able to create an associated token account to hold the token.
  lamportsToKeep += RENT_FEE_OF_ASSOCIATED_TOKEN_ACCOUNT_LAMPORTS;

  lamportsToKeep += MINIMUM_LAMPORTS_BALANCE_TO_KEEP_ON_A_WALLET_FOR_UNEXPECTED_EXPENSES;
  if (walletBalanceLamports < lamportsToKeep) {
    throw new Error(`Wallet balance ${Number(walletBalanceLamports) / LAMPORTS_PER_SOL} SOL is too low, required at least ${lamportsToKeep / LAMPORTS_PER_SOL} SOL for fees and unexpected expenses`);
  }

  return walletBalanceLamports - lamportsToKeep;
}

export async function buildBuyPlanByFullWalletBalances(
  walletStorage: WalletStorage,
  settings: Settings
): Promise<BuyPlan> {
  const { buyWallets } = await walletStorage.readWallets();
  const devWallet = await walletStorage.getDevWallet();

  const buyPlan: BuyPlan = [];
  buyPlan.push({
    wallet: devWallet,
    buySolLamportsPowerAmount: await calculateBuyAmountPowerLamportsOfWallet(devWallet, true, settings)
  });

  for (const buyWallet of buyWallets) {
    buyPlan.push({
      wallet: buyWallet,
      buySolLamportsPowerAmount: await calculateBuyAmountPowerLamportsOfWallet(buyWallet, false, settings)
    })
  }
  return buyPlan;
}

export async function handleBuyTokens(
  walletStorage: WalletStorage,
  tokenStorage: TokenStorage,
  settings: Settings
): Promise<BuyTransaction[]> {
  const existingTokenData = await tokenStorage.getToken();

  const mint = existingTokenData.mint;
  const buyPlan = await buildBuyPlanByFullWalletBalances(walletStorage, settings);

  const pumpFunSdk = await PumpFunSDK.create(connection);
  let bondingCurveAccount = await pumpFunSdk.getBondingCurveAccount(mint);
  if (!bondingCurveAccount) {
    throw new Error(`Token ${mint.toBase58()} bonding curve account does not exist`);
  }

  // TODO[architecture]: complete buy tokens handler.
}