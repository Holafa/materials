import { struct, bool, u64, Layout } from "@coral-xyz/borsh";
import { PublicKey } from '@solana/web3.js';
import { GlobalAccount } from './globalAccount';
import { calculateWithSlippageBuy, calculateWithSlippageSell } from './slippage-util';

export type SimulatedBuyResult = {
  newCurve: BondingCurveAccount;
  tokensToReturn: bigint;
  solLamportsFeeOnTop: bigint;
  maxSolLamportsCost: bigint;
};

export type SimulatedSellResult = {
  newCurve: BondingCurveAccount,
  solLamportsToReturn: bigint,
  minSolLamportsToReceive: bigint
};

export class BondingCurveAccount {
  public readonly accountKey: PublicKey;
  public readonly discriminator: bigint;
  public readonly virtualTokenReserves: bigint;
  public readonly virtualSolReserves: bigint;
  public readonly realTokenReserves: bigint;
  public readonly realSolReserves: bigint;
  public readonly tokenTotalSupply: bigint;
  public readonly complete: boolean;

  constructor(
    accountKey: PublicKey,
    discriminator: bigint,
    virtualTokenReserves: bigint,
    virtualSolReserves: bigint,
    realTokenReserves: bigint,
    realSolReserves: bigint,
    tokenTotalSupply: bigint,
    complete: boolean,
  ) {
    this.accountKey = accountKey;
    this.discriminator = discriminator;
    this.virtualTokenReserves = virtualTokenReserves;
    this.virtualSolReserves = virtualSolReserves;
    this.realTokenReserves = realTokenReserves;
    this.realSolReserves = realSolReserves;
    this.tokenTotalSupply = tokenTotalSupply;
    this.complete = complete;
  }

  static fromInitialGlobalAccount(globalAccount: GlobalAccount): BondingCurveAccount {
    return new BondingCurveAccount(
        globalAccount.accountKey,
        0n,
        globalAccount.initialVirtualTokenReserves,
        globalAccount.initialVirtualSolReserves,
        globalAccount.initialRealTokenReserves,
        0n,
        globalAccount.tokenTotalSupply,
        false
    );
  }

  simulateBuy(solLamportsAmount: bigint, feeBasisPoints: bigint, slippageBps: number): SimulatedBuyResult {
    if (this.complete) {
      throw new Error(`BondingCurve ${this.accountKey.toBase58()} is complete`);
    }

    if (solLamportsAmount <= 0n) {
      return {
        newCurve: this,
        tokensToReturn: 0n,
        solLamportsFeeOnTop: 0n,
        maxSolLamportsCost: 0n
      };
    }

    // Calculate the product of virtual reserves
    const n = this.virtualSolReserves * this.virtualTokenReserves;

    // Calculate the new virtual sol reserves after the purchase
    const newVirtualSolReserves = this.virtualSolReserves + solLamportsAmount;

    // Calculate the new virtual token reserves after the purchase
    const newVirtualTokenReserves = (n + newVirtualSolReserves - 1n) / newVirtualSolReserves;

    // Calculate the number of tokens to be purchased
    const tokensToReturn = this.virtualTokenReserves - newVirtualTokenReserves;

    // Calculate the new real token reserves after the purchase
    const newRealTokenReserves = tokensToReturn < this.realTokenReserves ? this.realTokenReserves - tokensToReturn : 0n;

    const newRealSolReserves = this.realSolReserves + solLamportsAmount;

    const solLamportsFeeOnTop = (solLamportsAmount * feeBasisPoints) / 10000n;
    const maxSolLamportsCost = calculateWithSlippageBuy(
      (solLamportsAmount + solLamportsFeeOnTop),
      slippageBps
    );

    const newCurve = new BondingCurveAccount(
        this.accountKey,
        this.discriminator,
        newVirtualTokenReserves,
        newVirtualSolReserves,
        newRealTokenReserves,
        newRealSolReserves,
        this.tokenTotalSupply,
        this.complete
    );
    return {
      newCurve,
      tokensToReturn,
      solLamportsFeeOnTop,
      maxSolLamportsCost
    };
  }

  simulateSell(
    tokenAmount: bigint,
    feeBasisPoints: bigint,
    slippageBps: number
  ): SimulatedSellResult {
    if (this.complete) {
      throw new Error(`BondingCurve ${this.accountKey.toBase58()} is complete`);
    }

    if (tokenAmount <= 0n) {
      return {
        newCurve: this,
        solLamportsToReturn: 0n,
        minSolLamportsToReceive: 0n
      };
    }

    // Calculate the new virtual token reserves after the sale
    const newVirtualTokenReserves = this.virtualTokenReserves + tokenAmount;

    // Calculate the product of virtual reserves
    const n = this.virtualSolReserves * this.virtualTokenReserves;

    // Calculate the new virtual sol reserves after the sale
    const newVirtualSolReserves = (n + newVirtualTokenReserves - 1n) / newVirtualTokenReserves;

    // Calculate the amount of SOL to be received
    const totalSolLamportsToReturn = this.virtualSolReserves - newVirtualSolReserves;

    const feeLamportsPaid = totalSolLamportsToReturn * feeBasisPoints / 10000n;

    const solLamportsToReturn = totalSolLamportsToReturn - feeLamportsPaid;

    const minSolLamportsToReceive = calculateWithSlippageSell(
      solLamportsToReturn,
      slippageBps
    );

    // Calculate the new real sol reserves after the sale
    const newRealSolReserves = totalSolLamportsToReturn < this.realSolReserves ? this.realSolReserves - totalSolLamportsToReturn : 0n;

    const newRealTokenReserves = this.realTokenReserves + tokenAmount;

    const newCurve = new BondingCurveAccount(
        this.accountKey,
        this.discriminator,
        newVirtualTokenReserves,
        newVirtualSolReserves,
        newRealTokenReserves,
        newRealSolReserves,
        this.tokenTotalSupply,
        this.complete
    );
    return {
      newCurve,
      solLamportsToReturn,
      minSolLamportsToReceive
    };
  }

  public static fromBuffer(
      accountKey: PublicKey,
      buffer: Buffer
  ): BondingCurveAccount {
    const structure: Layout<BondingCurveAccount> = struct([
      u64("discriminator"),
      u64("virtualTokenReserves"),
      u64("virtualSolReserves"),
      u64("realTokenReserves"),
      u64("realSolReserves"),
      u64("tokenTotalSupply"),
      bool("complete"),
    ]);

    let value = structure.decode(buffer);
    return new BondingCurveAccount(
      accountKey,
      BigInt(value.discriminator),
      BigInt(value.virtualTokenReserves),
      BigInt(value.virtualSolReserves),
      BigInt(value.realTokenReserves),
      BigInt(value.realSolReserves),
      BigInt(value.tokenTotalSupply),
      value.complete
    );
  }
}
