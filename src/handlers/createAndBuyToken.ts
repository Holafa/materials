import { Keypair, Transaction } from '@solana/web3.js';
import { PumpFunSDK } from '../pump-fun/pump-fun-sdk';
import { NewTokenMetadata } from '../pump-fun/types';
import { BuiltTransaction } from '../transaction/built-transaction';
import { connection } from '../rpc-connection';
import { WalletStorage } from '../wallet/wallet-storage';
import { Settings } from '../settings/settings';
import { TokenData } from '../token/types';
import { TokenStorage } from '../token/token-storage';
import { UxMessageStream } from '../ux-message/ux-message-stream';
import {
  CreatedNewTokenAddressMessage,
  SentJitoBundleMessage,
  UploadedTokenMetadataMessage
} from '../ux-message/ux-message';
import { BuyPlan } from './types';
import { JitoBundle } from '../transaction/jito/jito-bundle';
import { BondingCurveAccount } from '../pump-fun/bondingCurveAccount';
import { createBuyTransactions } from './buyTokens';
import { getJitoTipPaymentInstruction } from '../transaction/jito/get-jito-tip-payment-instruction';
import { BUYS_PER_TRANSACTION } from '../transaction/constants';
import { sendJitoBundle } from '../transaction/jito/send-jito-bundle';
import { awaitJitoBundleConfirmation } from '../transaction/jito/await-jito-bundle-confirmation';
import { TRANSFER_SOL_MAX_COMPUTE_UNITS } from '../transaction/priority-fee';

export type CreateBuyTransactionResult = {
  tokenData: TokenData;
  createTokenTransaction: BuiltTransaction;
}

async function createNewTokenTransaction(
    newTokenMetadata: NewTokenMetadata,
    walletStorage: WalletStorage,
    messageStream: UxMessageStream
): Promise<CreateBuyTransactionResult> {
  const creatorWallet = await walletStorage.getDevWallet();

  const pumpFunSdk = await PumpFunSDK.create(connection);

  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  await messageStream.sendMessage(new CreatedNewTokenAddressMessage(mint));
  const createdTokenMetadata = await pumpFunSdk.uploadTokenMetadata(newTokenMetadata);
  await messageStream.sendMessage(new UploadedTokenMetadataMessage(mint, createdTokenMetadata.metadataUri));
  const tokenData = TokenData.create(
      createdTokenMetadata,
      mintKeypair
  );

  const createTokenTransaction = await pumpFunSdk.createCreateTokenTransaction(creatorWallet.keypair, mintKeypair, createdTokenMetadata);
  return {
    tokenData,
    createTokenTransaction
  };
}

export type BundleToCreateTokenAndBuyAccordingToPlan = {
  bundle: JitoBundle,
  tokenData: TokenData
}

export async function createBundleToCreateTokenAndBuyAccordingToPlan(
  newTokenMetadata: NewTokenMetadata,
  buyPlan: BuyPlan,
  walletStorage: WalletStorage,
  tokenStorage: TokenStorage,
  messageStream: UxMessageStream,
  settings: Settings
): Promise<BundleToCreateTokenAndBuyAccordingToPlan> {
  const devWallet = await walletStorage.getDevWallet();

  const {
    createTokenTransaction,
    tokenData
  } = await createNewTokenTransaction(newTokenMetadata, walletStorage, messageStream);

  const pumpFunSdk = await PumpFunSDK.create(connection);
  const bondingCurveAccount = BondingCurveAccount.fromInitialGlobalAccount(pumpFunSdk.globalAccount);
  const buyTokenTransactions = await createBuyTransactions(
    tokenData.mint,
    bondingCurveAccount,
    buyPlan,
    settings.slippageBps
  );

  const bundle: JitoBundle = new JitoBundle();

  const devWalletJitoTipPaymentTransaction: BuiltTransaction = {
    transaction: new Transaction().add(
      getJitoTipPaymentInstruction(
        // The dev wallet pays the Jito tip for the entire bundle.
        devWallet.keypair,
        BigInt(settings.jitoTipLamports)
      )
    ),
    signers: [devWallet.keypair],
    feePayer: devWallet.keypair,
    maxComputeUnits: TRANSFER_SOL_MAX_COMPUTE_UNITS
  }
  const devWalletCreateAndBuyTransactions = [
    createTokenTransaction,
    devWalletJitoTipPaymentTransaction,
  ];

  const devWalletBuyTransaction = buyTokenTransactions.find(({ buyer }) => devWallet.publicKey.equals(buyer));
  if (devWalletBuyTransaction) {
    devWalletCreateAndBuyTransactions.push(devWalletBuyTransaction.createBuyerAtaTransaction);
    devWalletCreateAndBuyTransactions.push(devWalletBuyTransaction.buyTokenTransaction);
  }
  bundle.addBundleTransaction(
    devWalletCreateAndBuyTransactions,
    devWallet.keypair
  );

  // The buy wallets sell in the second and next transactions in a bundle.
  const buyWalletSellTransactions = buyTokenTransactions.filter(({ buyer }) => !devWallet.publicKey.equals(buyer));
  for (let index = 0; index < buyWalletSellTransactions.length; index += BUYS_PER_TRANSACTION) {
    const chunk = buyWalletSellTransactions.slice(index, index + BUYS_PER_TRANSACTION);
    bundle.addBundleTransaction(
      chunk.flatMap(({ buyTokenTransaction, createBuyerAtaTransaction }) =>
        [createBuyerAtaTransaction, buyTokenTransaction]
      ),
      // The first buyer in a transaction pays the native (minimum) fee.
      chunk[0].buyTokenTransaction.feePayer
    );
  }
  return {
    bundle,
    tokenData
  };
}

export async function handleCreateAndBuyToken(
    newTokenMetadata: NewTokenMetadata,
    walletStorage: WalletStorage,
    settings: Settings,
    tokenStorage: TokenStorage,
    buyPlan: BuyPlan,
    messageStream: UxMessageStream
): Promise<void> {
  const { bundle, tokenData } = await createBundleToCreateTokenAndBuyAccordingToPlan(
    newTokenMetadata,
    buyPlan,
    walletStorage,
    tokenStorage,
    messageStream,
    settings
  );

  const sentJitoBundle = await sendJitoBundle(bundle);
  await messageStream.sendMessage(new SentJitoBundleMessage(sentJitoBundle.bundleId, sentJitoBundle.transactionSignatures));
  await awaitJitoBundleConfirmation(sentJitoBundle);

  // TODO[architecture]: handle unconfirmed Jito bundle properly.
  await tokenStorage.setToken(tokenData);
}