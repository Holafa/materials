import { VersionedTransactionResponse } from "@solana/web3.js";

export type NewTokenMetadata = {
  name: string;
  symbol: string;
  description: string;
  image: Blob;
  twitter?: string;
  telegram?: string;
  website?: string;
};

export type CreatedTokenMetadata = {
  name: string;
  symbol: string;
  metadataUri: string;
};

export type TransactionResult = {
  signature?: string;
  error?: unknown;
  results?: VersionedTransactionResponse;
  success: boolean;
};
