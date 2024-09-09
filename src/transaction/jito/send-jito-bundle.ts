import axios from 'axios';
import { CONFIG } from '../../config';
import { createAndSignVersionedTransaction, getRecentBlockhash } from '../send-transaction-and-await-confirmation';
import base58 from 'bs58';
import { JitoBundle, JitoBundleId, MAX_TRANSACTIONS_IN_BUNDLE } from './jito-bundle';
import { handleAxiosError } from '../../utils/axios-utils';
import { getSignature } from '../get-signature';
import { SentJitoBundle } from './sent-jito-bundle';

const { JITO_RPC_URL } = CONFIG;

export const jitoAxiosInstance = axios.create({
  baseURL: JITO_RPC_URL
});

export async function sendJitoBundle(
  transactionBundle: JitoBundle
): Promise<SentJitoBundle> {
  if (transactionBundle.bundleTransactions.length > MAX_TRANSACTIONS_IN_BUNDLE) {
    throw new Error(`Jito supports maximum ${MAX_TRANSACTIONS_IN_BUNDLE} transactions in a bundle`);
  }

  try {
    const recentBlockhash = await getRecentBlockhash();

    const bundleTransactions = transactionBundle.bundleTransactions.map(
      ({ transaction }) => {
        // No need to pay extra priority fee. We only need to set the max compute units.
        return createAndSignVersionedTransaction(transaction, recentBlockhash, 0);
      }
    );

    const bundleRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [
        bundleTransactions.map((transaction) => base58.encode(transaction.serialize()))
      ]
    };

    const response = await jitoAxiosInstance.post("/api/v1/bundles", bundleRequest);

    // TODO[architecture]: improve this error handling.
    if (response.data.result) {
      const bundleId = response.data.result as JitoBundleId;
      const transactionSignatures = bundleTransactions.map((transaction) => getSignature(transaction));
      return {
        bundleId,
        transactionSignatures
      }
    } else if (response.data.error) {
      console.error("Error sending bundle:", response.data.error.message || response.data.error);
      throw new Error(response.data.error.message || "Unknown error while sending bundle");
    } else {
      console.error("Unexpected response structure:", response.data);
      throw new Error("Unexpected response structure");
    }
  } catch (error: any) {
    console.error(error);
    return handleAxiosError(error);
  }
}