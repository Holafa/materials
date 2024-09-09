import { getTransactionConfirmation } from '../send-transaction-and-await-confirmation';
import { SentJitoBundle } from './sent-jito-bundle';

export async function awaitJitoBundleConfirmation(sentJitoBundle: SentJitoBundle) {
  await getTransactionConfirmation(sentJitoBundle.transactionSignatures[0])
}