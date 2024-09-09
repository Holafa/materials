import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token';
import { getLamportsBalance, getTokenBalance } from '../balances/balancemanager';
import { connection } from '../rpc-connection';
import { sendTransactionAndAwaitConfirmation } from './send-transaction-and-await-confirmation';
import { BuiltTransaction } from './built-transaction';
import { UxMessageStream } from '../ux-message/ux-message-stream';
import {
  TinyWalletBalanceLeftOverMessage,
  TransferringSolMessage,
  TransferringTokensMessage
} from '../ux-message/ux-message';
import { NamedWallet, WalletData } from '../wallet/types';
import {
  getTotalTransactionFeeLamports,
  PriorityFeeLamports,
  TRANSFER_SOL_MAX_COMPUTE_UNITS,
  TRANSFER_TOKEN_MAX_COMPUTE_UNITS
} from './priority-fee';

export async function transferAllTokensAndCloseAccount(
  sourceWallet: WalletData,
  destinationWallet: NamedWallet,
  tokenAddr: PublicKey,
  priorityFeeLamports: PriorityFeeLamports,
  messageStream: UxMessageStream
): Promise<void> {
  const sourcePublicKey = sourceWallet.publicKey;
  const tokenBalance = await getTokenBalance(sourcePublicKey, tokenAddr);
  if (tokenBalance.amount === BigInt(0)) {
    return;
  }

  const sourceAta = getAssociatedTokenAddressSync(
    tokenAddr,
    sourcePublicKey,
    false
  );
  const destinationAta = getAssociatedTokenAddressSync(
    tokenAddr,
    destinationWallet.publicKey,
    false
  );
  const createDestinationAtaInstruction = createAssociatedTokenAccountIdempotentInstruction(
    sourcePublicKey,
    destinationAta,
    destinationWallet.publicKey,
    tokenAddr
  );

  const transferInstruction = createTransferInstruction(
    sourceAta,
    destinationAta,
    sourcePublicKey,
    BigInt(tokenBalance.amount)
  );

  const closeSourceAtaInstruction = createCloseAccountInstruction(
    sourceAta,
    sourcePublicKey,
    sourcePublicKey
  );

  const transaction = new Transaction();
  transaction.add(createDestinationAtaInstruction);
  transaction.add(transferInstruction);
  transaction.add(closeSourceAtaInstruction);

  const builtTransaction: BuiltTransaction = {
    transaction,
    signers: [sourceWallet.keypair],
    feePayer: sourceWallet.keypair,
    maxComputeUnits: TRANSFER_TOKEN_MAX_COMPUTE_UNITS
  }

  await messageStream.sendMessage(new TransferringTokensMessage(sourceWallet, destinationWallet, tokenAddr, tokenBalance.uiAmount));
  await sendTransactionAndAwaitConfirmation(builtTransaction, priorityFeeLamports, messageStream);
}

export async function transferAllSol(
  sourceWallet: WalletData,
  destinationWallet: NamedWallet,
  priorityFeeLamports: PriorityFeeLamports,
  messageStream: UxMessageStream
): Promise<void> {
  const lamportsBalance = await getLamportsBalance(sourceWallet.keypair.publicKey);
  if (lamportsBalance === 0) {
    return;
  }
  const feeLamports = getTotalTransactionFeeLamports(priorityFeeLamports);
  const amountLamports = lamportsBalance - feeLamports;
  if (amountLamports <= 0) {
    await messageStream.sendMessage(new TinyWalletBalanceLeftOverMessage(lamportsBalance, sourceWallet.publicKey, sourceWallet.name))
    return;
  }
  await transferSol(sourceWallet, destinationWallet, amountLamports / LAMPORTS_PER_SOL, priorityFeeLamports, messageStream);
}

export async function transferSol(
  sourceWallet: WalletData,
  destinationWallet: NamedWallet,
  amount: number,
  priorityFeeLamports: PriorityFeeLamports,
  messageStream: UxMessageStream
): Promise<void> {
  const sourcePublicKey = sourceWallet.keypair.publicKey;
  const solBalance = await connection.getBalance(sourcePublicKey);
  const fee = getTotalTransactionFeeLamports(priorityFeeLamports);
  const lamports = Math.round(amount * LAMPORTS_PER_SOL);
  const totalRequired = lamports + fee;

  if (totalRequired > solBalance) {
    throw new Error(`Insufficient lamports ${solBalance} < ${totalRequired} to cover the transfer amount and fee.`);
  }

  const solTransaction = new Transaction();
  solTransaction.add(
    SystemProgram.transfer({
      fromPubkey: sourcePublicKey,
      toPubkey: destinationWallet.publicKey,
      lamports
    })
  );

  const builtTransaction: BuiltTransaction = {
    transaction: solTransaction,
    signers: [sourceWallet.keypair],
    feePayer: sourceWallet.keypair,
    maxComputeUnits: TRANSFER_SOL_MAX_COMPUTE_UNITS
  }

  await messageStream.sendMessage(new TransferringSolMessage(sourceWallet, destinationWallet, amount))
  await sendTransactionAndAwaitConfirmation(builtTransaction, priorityFeeLamports, messageStream);
}