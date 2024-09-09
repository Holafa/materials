import {
  ComputeBudgetProgram,
  PublicKey,
  SimulatedTransactionResponse,
  Transaction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js';
import { connection } from '../rpc-connection';
import { DEFAULT_COMMITMENT, DEFAULT_FINALITY } from './constants';
import { BuiltTransaction } from './built-transaction';
import { deduplicateSigners } from './deduplicate-signers';
import { UxMessageStream } from '../ux-message/ux-message-stream';
import { SentTransactionMessage, TransactionConfirmedMessage } from '../ux-message/ux-message';
import { MAX_SOLANA_TRANSACTION_COMPUTE_UNITS, PriorityFeeLamports } from './priority-fee';

export async function getRecentBlockhash(): Promise<string> {
  return (await connection.getLatestBlockhash("confirmed")).blockhash;
}

export async function sendTransactionAndAwaitConfirmation(
  builtTransaction: BuiltTransaction,
  priorityFeeLamports: PriorityFeeLamports,
  messageStream: UxMessageStream,
  commitment = DEFAULT_COMMITMENT,
  finality = DEFAULT_FINALITY
): Promise<void> {
  const recentBlockhash = await getRecentBlockhash();
  const versionedTx = createAndSignVersionedTransaction(builtTransaction, recentBlockhash, priorityFeeLamports);

  // TODO[solana]: handle submission errors.
  const signature = await connection.sendTransaction(versionedTx, {
    skipPreflight: false,
  });

  await messageStream.sendMessage(new SentTransactionMessage(signature));

  // TODO[solana]: handle confirmation errors.
  const txResult = await getTransactionConfirmation(signature, commitment, finality);
  if (!txResult) {
    throw new Error(`Transaction ${signature} was not confirmed.`);
  }

  await messageStream.sendMessage(new TransactionConfirmedMessage(signature));
}

export async function simulateTransaction(
  builtTransaction: BuiltTransaction,
  priorityFeeLamports: PriorityFeeLamports,
  accountsToFetchDataAfterSimulation: PublicKey[] = []
): Promise<SimulatedTransactionResponse> {
  const recentBlockhash = await getRecentBlockhash();
  const versionedTx = createAndSignVersionedTransaction(builtTransaction, recentBlockhash, priorityFeeLamports);
  const simulationResponse = await connection.simulateTransaction(
    versionedTx,
    {
      innerInstructions: true,
      sigVerify: true,
      accounts: {
        encoding: 'base64',
        addresses: accountsToFetchDataAfterSimulation.map((key) => key.toBase58()),
      }
    },
  );
  return simulationResponse.value;
}


export function createAndSignVersionedTransaction(
  builtTransaction: BuiltTransaction,
  recentBlockhash: string,
  priorityFeeLamports: PriorityFeeLamports,
): VersionedTransaction {
  const finalTransaction = new Transaction();

  const maxComputeUnits = builtTransaction.maxComputeUnits;
  if (maxComputeUnits > MAX_SOLANA_TRANSACTION_COMPUTE_UNITS) {
    throw new Error(`Transaction compute units ${maxComputeUnits} are more than Solana maximum ${MAX_SOLANA_TRANSACTION_COMPUTE_UNITS}`);
  }

  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: maxComputeUnits,
  });
  finalTransaction.add(modifyComputeUnits);

  if (priorityFeeLamports > 0) {
    const microLamportsPerLamport = 1_000_000;
    const unitPriceMicroLamports = Math.round(microLamportsPerLamport * priorityFeeLamports / maxComputeUnits);
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: unitPriceMicroLamports,
    });
    finalTransaction.add(addPriorityFee);
  }

  finalTransaction.add(builtTransaction.transaction);

  const versionedTx = new VersionedTransaction(new TransactionMessage({
    payerKey: builtTransaction.feePayer.publicKey,
    recentBlockhash,
    instructions: finalTransaction.instructions,
  }).compileToV0Message());

  const signers = deduplicateSigners([builtTransaction.feePayer, ...builtTransaction.signers]);
  versionedTx.sign(signers);
  return versionedTx;
}

export async function getTransactionConfirmation(
  signature: string,
  commitment = DEFAULT_COMMITMENT,
  finality = DEFAULT_FINALITY
): Promise<any> {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: signature,
    },
    commitment
  );

  return connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: finality,
  });
}

