import { Keypair, PublicKey } from '@solana/web3.js';
import { CreatedTokenMetadata } from '../pump-fun/types';

export class TokenData {
    constructor(
        readonly metadata: CreatedTokenMetadata,
        readonly mint: PublicKey,
        readonly keypair: Keypair,
    ) {
    }

    static create(metadata: CreatedTokenMetadata, keypair: Keypair): TokenData {
        return new TokenData(
            metadata,
            keypair.publicKey,
            keypair
        )
    }

    toString() {
        return this.mint.toBase58() + " (" + this.metadata.name + ")"
    }
}