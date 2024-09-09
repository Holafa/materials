import { Keypair, PublicKey, TransactionSignature } from '@solana/web3.js';
import { NamedWallet, WalletData } from '../wallet/types';
import { getBase58ByKeypair } from '../utils/keypair-utils';
import { JitoBundleId } from '../transaction/jito/jito-bundle';

export interface UxMessage {
    toMarkdownV2(): string;
}

export class WalletBalanceMessage implements UxMessage {
    constructor(
        readonly balanceSol: number,
        readonly walletAddress: PublicKey,
        readonly walletName: string,
        readonly balanceToken?: number,
    ) {
    }

    toMarkdownV2(): string {
        return `*${this.walletName}* \\(\`${this.walletAddress.toBase58()}\`\\) SOL balance is \`${this.balanceSol}\`` + (this.balanceToken ? ` and token balance is \`${this.balanceToken}\`` : '');
    }

    toString() {
        return this.toMarkdownV2();
    }
}

export class WalletPrivateKeyMessage implements UxMessage {
    constructor(
      readonly walletName: string,
      readonly keypair: Keypair,
    ) {
    }

    toMarkdownV2(): string {
        return `*${this.walletName}* \\(\`${this.keypair.publicKey.toBase58()}\`\\) 
Private Key: \`${getBase58ByKeypair(this.keypair)}\`        
`;
    }

    toString() {
        return this.toMarkdownV2();
    }
}


export class TinyWalletBalanceLeftOverMessage implements UxMessage {
    constructor(
        readonly balanceLamports: number,
        readonly walletAddress: PublicKey,
        readonly walletName: string,
    ) {
    }

    toMarkdownV2(): string {
        return `💸 Wallet *${this.walletName}* \\(\`${this.walletAddress.toBase58()}\`\\) balance \`${this.balanceLamports}\` lamports is less than a transaction fee, this tiny amount will be left over in the wallet`
    }

    toString() {
        return this.toMarkdownV2();
    }
}

export class TransferringSolMessage implements UxMessage {
    constructor(
        readonly sourceWallet: WalletData,
        readonly destinationWallet: NamedWallet,
        readonly amountSol: number
    ) {
    }

    toMarkdownV2(): string {
        return `⏳ Transferring \`${this.amountSol}\` SOL from ${(this.sourceWallet.toMarkdownV2())} to ${(this.destinationWallet.toMarkdownV2())}`;
    }

    toString() {
        return this.toMarkdownV2();
    }
}

export class TransferringTokensMessage implements UxMessage {
    constructor(
      readonly sourceWallet: WalletData,
      readonly destinationWallet: NamedWallet,
      readonly mint: PublicKey,
      readonly amountOfToken: number
    ) {
    }

    toMarkdownV2(): string {
        return `⏳ Transferring \`${this.amountOfToken}\` of token \`${this.mint.toBase58()}\` from ${(this.sourceWallet.toMarkdownV2())} to ${(this.destinationWallet.toMarkdownV2())}`;
    }

    toString() {
        return this.toMarkdownV2();
    }
}

export class SentTransactionMessage implements UxMessage {
    constructor(
        readonly transactionSignature: TransactionSignature
    ) {
    }

    toMarkdownV2(): string {
        const shortSignature = this.transactionSignature.substring(0, 6) + "\\.\\.\\.";
        return `⏳ Sent transaction [${shortSignature}](https://solscan.io/tx/${this.transactionSignature})`;
    }

    toString() {
        return this.toMarkdownV2();
    }
}

export class SentJitoBundleMessage implements UxMessage {
    constructor(
      readonly bundleId: JitoBundleId,
      readonly transactionSignatures: TransactionSignature[]
    ) {
    }

    toMarkdownV2(): string {
        return `⏳ Sent Jito bundle \`${this.bundleId}\` of \`${this.transactionSignatures.length}\` transactions:\n` +
          this.transactionSignatures.map((signature) => {
              const shortSignature = signature.substring(0, 6) + "\\.\\.\\.";
              return `[${shortSignature}](https://solscan.io/tx/${signature})`
          }).join("\n");
    }

    toString() {
        return this.toMarkdownV2();
    }
}


export class TransactionConfirmedMessage implements UxMessage {
    constructor(
        readonly transactionSignature: TransactionSignature
    ) {
    }

    toMarkdownV2(): string {
        const shortSignature = this.transactionSignature.substring(0, 6) + "\\.\\.\\.";
        return `✅ Transaction [${shortSignature}](https://solscan.io/tx/${this.transactionSignature}) has been confirmed on chain`;
    }

    toString() {
        return this.toMarkdownV2();
    }
}

export class CreatedNewTokenAddressMessage implements UxMessage {
    constructor(
        readonly tokenAddress: PublicKey
    ) {
    }

    toMarkdownV2(): string {
        return `🪙 Created new token address \`${this.tokenAddress.toBase58()}\``;
    }

    toString() {
        return this.toMarkdownV2();
    }
}

export class UploadedTokenMetadataMessage implements UxMessage {
    constructor(
        readonly tokenAddress: PublicKey,
        readonly metadataUrl: string
    ) {
    }

    toMarkdownV2(): string {
        return `🪙 Token \`${this.tokenAddress.toBase58()}\` metadata has been uploaded to [IPFS](${this.metadataUrl})`;
    }

    toString() {
        return this.toMarkdownV2();
    }
}
