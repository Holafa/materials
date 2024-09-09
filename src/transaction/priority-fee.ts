export type PriorityFeeLamports = number;
export type PriorityFeeMaxUnits = number;

export const DEFAULT_FEE_LAMPORTS = 5000;

export const MAX_SOLANA_TRANSACTION_COMPUTE_UNITS = 1_400_000;

// TODO[architecture]: estimate these more accurately.
export const TRANSFER_TOKEN_MAX_COMPUTE_UNITS: PriorityFeeMaxUnits = 20000;
export const TRANSFER_SOL_MAX_COMPUTE_UNITS: PriorityFeeMaxUnits = 15000;

export function getTotalTransactionFeeLamports(
  priorityFeeLamports: PriorityFeeLamports,
  numberOfSigners = 1,
): number {
  return numberOfSigners * DEFAULT_FEE_LAMPORTS + priorityFeeLamports;
}