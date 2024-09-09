export function calculateWithSlippageBuy(
  amount: bigint,
  basisPoints: number
) {
  return amount + (amount * BigInt(basisPoints)) / 10000n;
}

export const calculateWithSlippageSell = (
  amount: bigint,
  basisPoints: number
) => {
  return amount - (amount * BigInt(basisPoints)) / 10000n;
};