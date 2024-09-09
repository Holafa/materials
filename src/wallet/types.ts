import { Keypair, PublicKey } from '@solana/web3.js';

export class NamedWallet {
    constructor(
        readonly name: string,
        readonly publicKey: PublicKey,
    ) {
    }

    toMarkdownV2(): string {
        return `Wallet *${this.name}* \\(\`${this.publicKey.toBase58()}\`\\)`;
    }

    toString() {
        return this.name + " (" + this.publicKey.toBase58() + ")";
    }
}

export class WalletData extends NamedWallet {
    constructor(
        name: string,
        publicKey: PublicKey,
        readonly keypair: Keypair,
    ) {
        super(name, publicKey);
    }

    static create(name: string, keypair: Keypair): WalletData {
        return new WalletData(
            name,
            keypair.publicKey,
            keypair
        )
    }
}

export type WalletsData = {
    buyWallets: WalletData[];
    devWallet?: WalletData;
}