import { PublicKey } from '@solana/web3.js';
import { connection } from '../rpc-connection';

export interface TokenBalance {
    amount: bigint;
    uiAmount: number;
}

export async function getTokenBalance(owner: PublicKey, token: PublicKey): Promise<TokenBalance> {
    const result = await connection.getTokenAccountsByOwner(owner, { mint: token });
    if (result.value.length === 0) {
        return { amount: BigInt(0), uiAmount: 0 };
    }
    const info = await connection.getTokenAccountBalance(result.value[0].pubkey);
    return { amount: BigInt(info.value.amount), uiAmount: info.value.uiAmount! };
}

export async function getLamportsBalance(ownerPublicKey: PublicKey): Promise<number> {
    return await connection.getBalance(ownerPublicKey);
}

export async function getSolBalance(ownerPublicKey: PublicKey): Promise<number> {
    return (await getLamportsBalance(ownerPublicKey)) / 1e9;
}
