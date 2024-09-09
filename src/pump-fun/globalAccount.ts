import { Commitment, PublicKey } from "@solana/web3.js";
import { struct, bool, u64, publicKey, Layout } from "@coral-xyz/borsh";
import { DEFAULT_COMMITMENT } from '../transaction/constants';
import { GLOBAL_ACCOUNT_SEED, PUMP_FUN_PROGRAM_ID } from './pump-fun-sdk';
import { connection } from '../rpc-connection';

export class GlobalAccount {
  public accountKey: PublicKey;
  public discriminator: bigint;
  public initialized: boolean = false;
  public authority: PublicKey;
  public feeRecipient: PublicKey;
  public initialVirtualTokenReserves: bigint;
  public initialVirtualSolReserves: bigint;
  public initialRealTokenReserves: bigint;
  public tokenTotalSupply: bigint;
  public feeBasisPoints: bigint;

  constructor(
    accountKey: PublicKey,
    discriminator: bigint,
    initialized: boolean,
    authority: PublicKey,
    feeRecipient: PublicKey,
    initialVirtualTokenReserves: bigint,
    initialVirtualSolReserves: bigint,
    initialRealTokenReserves: bigint,
    tokenTotalSupply: bigint,
    feeBasisPoints: bigint
  ) {
    this.accountKey = accountKey;
    this.discriminator = discriminator;
    this.initialized = initialized;
    this.authority = authority;
    this.feeRecipient = feeRecipient;
    this.initialVirtualTokenReserves = initialVirtualTokenReserves;
    this.initialVirtualSolReserves = initialVirtualSolReserves;
    this.initialRealTokenReserves = initialRealTokenReserves;
    this.tokenTotalSupply = tokenTotalSupply;
    this.feeBasisPoints = feeBasisPoints;
  }

  static async getGlobalAccount(commitment: Commitment = DEFAULT_COMMITMENT) {
    const [globalAccountPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_ACCOUNT_SEED)],
        PUMP_FUN_PROGRAM_ID
    );

    const tokenAccount = await connection.getAccountInfo(
        globalAccountPDA,
        commitment
    );

    return GlobalAccount.fromBuffer(globalAccountPDA, tokenAccount!.data);
  }

  public static fromBuffer(accountKey: PublicKey, buffer: Buffer): GlobalAccount {
    const structure: Layout<GlobalAccount> = struct([
      u64("discriminator"),
      bool("initialized"),
      publicKey("authority"),
      publicKey("feeRecipient"),
      u64("initialVirtualTokenReserves"),
      u64("initialVirtualSolReserves"),
      u64("initialRealTokenReserves"),
      u64("tokenTotalSupply"),
      u64("feeBasisPoints"),
    ]);

    let value = structure.decode(buffer);
    return new GlobalAccount(
      accountKey,
      BigInt(value.discriminator),
      value.initialized,
      value.authority,
      value.feeRecipient,
      BigInt(value.initialVirtualTokenReserves),
      BigInt(value.initialVirtualSolReserves),
      BigInt(value.initialRealTokenReserves),
      BigInt(value.tokenTotalSupply),
      BigInt(value.feeBasisPoints)
    );
  }
}
