import { Commitment, Connection, Keypair, PublicKey, Transaction, } from "@solana/web3.js";
import { AnchorProvider, Program, Provider } from "@coral-xyz/anchor";
import { GlobalAccount } from "./globalAccount";
import { CreatedTokenMetadata, NewTokenMetadata, } from "./types";
import { getAssociatedTokenAddressSync, } from "@solana/spl-token";
import { BondingCurveAccount, SimulatedBuyResult, SimulatedSellResult } from "./bondingCurveAccount";
import { BN } from "bn.js";
import { IDL, PumpFun } from "./IDL";
import { DEFAULT_COMMITMENT } from '../transaction/constants';
import { BuiltTransaction } from '../transaction/built-transaction';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { PriorityFeeMaxUnits } from '../transaction/priority-fee';
import { RENT_FEE_OF_ASSOCIATED_TOKEN_ACCOUNT_LAMPORTS } from '../transaction/token/create-ata-transaction';

export const PUMP_FUN_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
export const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export const GLOBAL_ACCOUNT_SEED = "global";
export const BONDING_CURVE_SEED = "bonding-curve";
export const METADATA_SEED = "metadata";

// noinspection JSUnusedGlobalSymbols
export const PUMP_FUN_TOKEN_DECIMALS = 6;

// Pump.Fun fee is 1% both on buys and sells.
export const PUMP_FUN_FEE_BPS = 100;

export const CREATE_TOKEN_TRANSACTION_MAX_CONSUME_UNITS: PriorityFeeMaxUnits = 150_000;
export const BUY_TRANSACTION_MAX_CONSUME_UNITS: PriorityFeeMaxUnits = 40_000;
export const SELL_TRANSACTION_MAX_CONSUME_UNITS: PriorityFeeMaxUnits = 40_000;

export const COST_OF_CREATING_TOKEN_ACCOUNT_LAMPORTS = 1_461_600n
export const COST_OF_CREATING_BONDING_CURVE_ACCOUNT_LAMPORTS = 1_231_920n
export const COST_OF_CREATING_BONDING_CURVE_ASSOCIATED_ACCOUNT_LAMPORTS = RENT_FEE_OF_ASSOCIATED_TOKEN_ACCOUNT_LAMPORTS
export const COST_OF_CREATING_TOKEN_METAPLEX_METADATA_ACCOUNT = 15_616_720n
export const TOTAL_COST_PAID_BY_CREATOR_WALLET_LAMPORTS = COST_OF_CREATING_TOKEN_ACCOUNT_LAMPORTS +
  COST_OF_CREATING_BONDING_CURVE_ACCOUNT_LAMPORTS +
  COST_OF_CREATING_BONDING_CURVE_ASSOCIATED_ACCOUNT_LAMPORTS +
  COST_OF_CREATING_TOKEN_METAPLEX_METADATA_ACCOUNT

export class PumpFunSDK {
  private readonly program: Program<PumpFun>;
  private readonly connection: Connection;

  constructor(readonly globalAccount: GlobalAccount, provider?: Provider) {
    this.program = new Program<PumpFun>(IDL as PumpFun, provider);
    this.connection = this.program.provider.connection;
  }

  static async create(connection: Connection) {
    const unusedWallet = new NodeWallet(new Keypair());
    const provider = new AnchorProvider(connection, unusedWallet, { commitment: DEFAULT_COMMITMENT });
    const globalAccount = await GlobalAccount.getGlobalAccount();
    return new PumpFunSDK(globalAccount, provider)
  }

  async uploadTokenMetadata(
    newTokenMetadata: NewTokenMetadata
  ): Promise<CreatedTokenMetadata> {
    return await this.submitTokenMetadata(newTokenMetadata);
  }

  async createCreateTokenTransaction(
    creator: Keypair,
    mint: Keypair,
    createdTokenMetadata: CreatedTokenMetadata
  ): Promise<BuiltTransaction> {
    const createTx = await this.getCreateTokenInstructions(
      creator.publicKey,
      createdTokenMetadata,
      mint
    );

    const transaction = new Transaction().add(createTx);
    return {
      transaction,
      signers: [creator, mint],
      feePayer: creator,
      maxComputeUnits: CREATE_TOKEN_TRANSACTION_MAX_CONSUME_UNITS
    }
  }

  // Note: the buyer pays solLamportsAmount + fee (1%).
  // The solLamportsAmount determines the output token amount.
  // The fee is paid on top of the solLamportsAmount and transferred to the Pump.Fun wallet.
  async createBuyTransaction(
    bondingCurveAccount: BondingCurveAccount,
    buyer: Keypair,
    mint: PublicKey,
    solLamportsAmount: bigint,
    slippageBps: number,
  ): Promise<{
    buyTransaction: BuiltTransaction,
    simulatedBuyResult: SimulatedBuyResult
  }> {
    const simulatedBuyResult = bondingCurveAccount.simulateBuy(
      solLamportsAmount,
      this.globalAccount.feeBasisPoints,
      slippageBps
    );

    const bondingCurveMintAta = this.getAssociatedBondingCurve(mint);

    const buyerMintAta = getAssociatedTokenAddressSync(mint, buyer.publicKey, false);

    const buyTransaction = new Transaction();
    buyTransaction.add(
      await this.program.methods
        .buy(new BN(simulatedBuyResult.tokensToReturn.toString()), new BN(simulatedBuyResult.maxSolLamportsCost.toString()))
        .accounts({
          feeRecipient: this.globalAccount.feeRecipient,
          mint: mint,
          associatedBondingCurve: bondingCurveMintAta,
          associatedUser: buyerMintAta,
          user: buyer.publicKey,
        })
        .transaction()
    );

    return {
      buyTransaction: {
        transaction: buyTransaction,
        signers: [buyer],
        feePayer: buyer,
        maxComputeUnits: BUY_TRANSACTION_MAX_CONSUME_UNITS
      },
      simulatedBuyResult
    }
  }

  async createSellTransaction(
    bondingCurveAccount: BondingCurveAccount,
    seller: Keypair,
    mint: PublicKey,
    sellTokenAmount: bigint,
    slippageBasisPoints: number = 500
  ): Promise<{
    sellTransaction: BuiltTransaction,
    simulatedSellResult: SimulatedSellResult
  }> {
    const simulatedSellResult = bondingCurveAccount.simulateSell(
      sellTokenAmount,
      this.globalAccount.feeBasisPoints,
      slippageBasisPoints
    );

    const bondingCurveMintAta = this.getAssociatedBondingCurve(mint);

    const sellerMintAta = getAssociatedTokenAddressSync(mint, seller.publicKey, false);

    const transaction = new Transaction();

    transaction.add(
      await this.program.methods
        .sell(new BN(sellTokenAmount.toString()), new BN(simulatedSellResult.minSolLamportsToReceive.toString()))
        .accounts({
          feeRecipient: this.globalAccount.feeRecipient,
          mint: mint,
          associatedBondingCurve: bondingCurveMintAta,
          associatedUser: sellerMintAta,
          user: seller.publicKey,
        })
        .transaction()
    );

    const signers = [seller];
    return {
      sellTransaction: {
        transaction,
        signers,
        feePayer: seller,
        maxComputeUnits: SELL_TRANSACTION_MAX_CONSUME_UNITS
      },
      simulatedSellResult
    }
  }

  private async getCreateTokenInstructions(
    creator: PublicKey,
    createdTokenMetadata: CreatedTokenMetadata,
    mint: Keypair
  ) {
    const mplTokenMetadata = MPL_TOKEN_METADATA_PROGRAM_ID;

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        mplTokenMetadata.toBuffer(),
        mint.publicKey.toBuffer(),
      ],
      mplTokenMetadata
    );

    const associatedBondingCurve = this.getAssociatedBondingCurve(mint.publicKey);

    return this.program.methods
      .create(createdTokenMetadata.name, createdTokenMetadata.symbol, createdTokenMetadata.metadataUri)
      .accounts({
        mint: mint.publicKey,
        associatedBondingCurve: associatedBondingCurve,
        metadata: metadataPDA,
        user: creator,
      })
      .signers([mint])
      .transaction();
  }

  private getAssociatedBondingCurve(mint: PublicKey) {
    return getAssociatedTokenAddressSync(
      mint,
      this.getBondingCurvePDA(mint),
      true
    );
  }

  async getBondingCurveAccount(
    mint: PublicKey,
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
    const bondingCurvePda = this.getBondingCurvePDA(mint);
    const tokenAccount = await this.connection.getAccountInfo(
      bondingCurvePda,
      commitment
    );
    if (!tokenAccount) {
      return null;
    }
    return BondingCurveAccount.fromBuffer(
      bondingCurvePda,
      tokenAccount!.data
    );
  }

  getBondingCurvePDA(mint: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
      this.program.programId
    )[0];
  }

  // TODO[architectue]: use axios.
  private async submitTokenMetadata(create: NewTokenMetadata): Promise<CreatedTokenMetadata> {
    console.log("Uploading token metadata", { ...create, image: `<image of ${create.image.size} bytes>` });
    let formData = new FormData();
    formData.append("file", create.image);
    formData.append("name", create.name);
    formData.append("symbol", create.symbol);
    formData.append("description", create.description);
    formData.append("twitter", create.twitter || "");
    formData.append("telegram", create.telegram || "");
    formData.append("website", create.website || "");
    formData.append("showName", "true");
    const request = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      body: formData,
    });
    const response = await request.json();
    if (!response.metadataUri) {
      throw new Error("Failed to created metadata: ${response}");
    }
    return {
      name: create.name,
      symbol: create.symbol,
      metadataUri: response.metadataUri
    };
  }

  static calculateEffectiveBuySolLamportsAmount(totalSolLamportsPower: bigint): bigint {
    return totalSolLamportsPower * 10000n / (10000n + BigInt(PUMP_FUN_FEE_BPS));
  }
}
