import { PumpFunSDK } from '../pump-fun/pump-fun-sdk';
import { connection } from '../rpc-connection';
import { WalletData } from '../wallet/types';
import { getTokenBalance, TokenBalance } from '../balances/balancemanager';
import { BuiltTransaction } from '../transaction/built-transaction';
import { createCloseAtaTransaction } from '../transaction/close-ata-transaction';
import { WalletStorage } from '../wallet/wallet-storage';
import { TokenStorage } from '../token/token-storage';
import { JitoBundle } from '../transaction/jito/jito-bundle';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getJitoTipPaymentInstruction } from '../transaction/jito/get-jito-tip-payment-instruction';
import { TRANSFER_SOL_MAX_COMPUTE_UNITS } from '../transaction/priority-fee';
import { SELLS_PER_TRANSACTION } from '../transaction/constants';
import { Settings } from '../settings/settings';
import { sendJitoBundle } from '../transaction/jito/send-jito-bundle';
import { SentJitoBundleMessage } from '../ux-message/ux-message';
import { awaitJitoBundleConfirmation } from '../transaction/jito/await-jito-bundle-confirmation';
import { UxMessageStream } from '../ux-message/ux-message-stream';

export type SellPlan = {
  wallet: WalletData;
  amountToSell: TokenBalance
}[]

export type SellTransaction = {
  seller: PublicKey;
  sellTokenTransaction: BuiltTransaction
  closeSellerAtaTransaction: BuiltTransaction;
}

export async function buildSellPlanToSellAllAvailableTokensOnDevAndBuyWallets(
  devWallet: WalletData,
  buyWallets: WalletData[],
  tokenStorage: TokenStorage
) {
  const tokenData = await tokenStorage.getToken();
  const mint = tokenData.mint;
  const sellPlan: SellPlan = [];

  const devBalance = await getTokenBalance(devWallet.publicKey, mint);
  if (devBalance.amount > 0n) {
    sellPlan.push({
      wallet: devWallet,
      amountToSell: devBalance,
    });
  }

  for (const buyWallet of buyWallets) {
    const balance = await getTokenBalance(buyWallet.publicKey, mint);
    if (balance.amount > 0n) {
      sellPlan.push({
        wallet: buyWallet,
        amountToSell: balance
      });
    }
  }
  return sellPlan;
}


export async function handleSell(
  walletStorage: WalletStorage,
  tokenStorage: TokenStorage,
  settings: Settings,
  sellPlan: SellPlan,
  messageStream: UxMessageStream
) {
  const tokenData = await tokenStorage.getToken();
  const jitoBundle = await createBundleToSellAllAvailableTokensOnBuyWalletsAndCloseAccounts(walletStorage, tokenData.mint, sellPlan, settings);

  const sentJitoBundle = await sendJitoBundle(jitoBundle);
  await messageStream.sendMessage(new SentJitoBundleMessage(sentJitoBundle.bundleId, sentJitoBundle.transactionSignatures));
  await awaitJitoBundleConfirmation(sentJitoBundle);
}

async function createSellTransactions(
  sellPlan: SellPlan,
  mint: PublicKey
): Promise<SellTransaction[]> {
  const pumpFunSdk = await PumpFunSDK.create(connection);
  let bondingCurveAccount = await pumpFunSdk.getBondingCurveAccount(mint);
  if (!bondingCurveAccount) {
    throw new Error(`Token ${mint.toBase58()} bonding curve account does not exist`);
  }

  const sellTokenTransactions: SellTransaction[] = [];
  for (const { wallet: buyWallet, amountToSell } of sellPlan) {
    const { sellTransaction: sellTokenTransaction, simulatedSellResult } =
      await pumpFunSdk.createSellTransaction(bondingCurveAccount, buyWallet.keypair, mint, amountToSell.amount);
    bondingCurveAccount = simulatedSellResult.newCurve;

    const closeSellerAtaTransaction = createCloseAtaTransaction(buyWallet.keypair, mint);
    sellTokenTransactions.push({
      seller: buyWallet.publicKey,
      sellTokenTransaction,
      closeSellerAtaTransaction
    });
  }

  return sellTokenTransactions
}

export async function createBundleToSellAllAvailableTokensOnBuyWalletsAndCloseAccounts(
  walletStorage: WalletStorage,
  mint: PublicKey,
  sellPlan: SellPlan,
  settings: Settings
): Promise<JitoBundle> {
  const devWallet = await walletStorage.getDevWallet();

  const bundle: JitoBundle = new JitoBundle();

  const sellTransactions: SellTransaction[] = await createSellTransactions(sellPlan, mint);
  const devWalletJitoTipPaymentTransaction = {
    transaction: new Transaction().add(
      // Dev wallet pays the Jito tip for the entire bundle.
      getJitoTipPaymentInstruction(devWallet.keypair, BigInt(settings.jitoTipLamports))
    ),
    signers: [devWallet.keypair],
    feePayer: devWallet.keypair,
    maxComputeUnits: TRANSFER_SOL_MAX_COMPUTE_UNITS
  };

  // The dev wallet sells in the first transaction in a bundle and pays Jito tip in there.
  const devWalletJitoBundleTransaction = [
    devWalletJitoTipPaymentTransaction
  ];
  const devWalletSellTransaction = sellTransactions.find(({ seller }) => devWallet.publicKey.equals(seller));
  if (devWalletSellTransaction) {
    devWalletJitoBundleTransaction.push(devWalletSellTransaction.sellTokenTransaction);
    devWalletJitoBundleTransaction.push(devWalletSellTransaction.closeSellerAtaTransaction);
  }
  bundle.addBundleTransaction(
    devWalletJitoBundleTransaction,
    devWallet.keypair
  );

  // The buy wallets sell in the second and next transactions in a bundle.
  const buyWalletSellTransactions = sellTransactions.filter(({ seller }) => !devWallet.publicKey.equals(seller));
  for (let index = 0; index < buyWalletSellTransactions.length; index += SELLS_PER_TRANSACTION) {
    const chunk = buyWalletSellTransactions.slice(index, index + SELLS_PER_TRANSACTION);
    bundle.addBundleTransaction(
      chunk.flatMap(({ sellTokenTransaction, closeSellerAtaTransaction }) =>
        [sellTokenTransaction, closeSellerAtaTransaction]
      ),
      // The first seller in a transaction pays the native (minimum) fee.
      chunk[0].sellTokenTransaction.feePayer
    )
  }
  return bundle;
}