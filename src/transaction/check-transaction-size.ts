import { VersionedTransaction } from '@solana/web3.js';

const MAX_RAW_SIZE = 1232;
const MAX_BASE64_ENCODED_SIZE = 1644;


export function getTransactionEncodingSize(transaction: VersionedTransaction) {
  const rawBytes = transaction.serialize();
  const base64Encoding = Buffer.from(rawBytes).toString('base64');
  return { rawSize: rawBytes.length, base64Encoding: base64Encoding.length };
}

export function checkVersionedTransactionSize(transaction: VersionedTransaction): boolean {
  const { rawSize, base64Encoding } = getTransactionEncodingSize(transaction);
  if (rawSize > MAX_RAW_SIZE) {
    return false;
  }
  return base64Encoding <= MAX_BASE64_ENCODED_SIZE;
}