import { DiskStorage } from '../storage/disk-storage';
import { TokenData } from './types';
import { createKeypairFromBase58, getBase58ByKeypair } from '../utils/keypair-utils';
import { CreatedTokenMetadata } from '../pump-fun/types';
import { TokenStorage } from './token-storage';

/**
 * This type is only for serializing/deserializing the token data to the file.
 */
type TokenDataOnDisk = {
    address: string;
    mintPrivateKey: string;
    metadata: CreatedTokenMetadata;
}

export class DiskTokenStorage implements TokenStorage {

    private static TOKEN_STORAGE_KEY = 'token';

    constructor(private storage: DiskStorage) {
    }

    async setToken(tokenData: TokenData): Promise<void> {
        await this.saveToken(tokenData);
    }

    async readToken(): Promise<TokenData | undefined> {
        const tokenDataOnDisk = await this.storage.load<TokenDataOnDisk>(DiskTokenStorage.TOKEN_STORAGE_KEY);

        if (!tokenDataOnDisk) {
            return undefined;
        }

        const keypair = createKeypairFromBase58(tokenDataOnDisk.mintPrivateKey);
        return TokenData.create(tokenDataOnDisk.metadata, keypair);
    }

    private async saveToken(tokenData: TokenData): Promise<void> {
        const tokenDataOnDisk: TokenDataOnDisk = {
            address: tokenData.mint.toBase58(),
            mintPrivateKey: getBase58ByKeypair(tokenData.keypair),
            metadata: tokenData.metadata,
        };

        await this.storage.save(DiskTokenStorage.TOKEN_STORAGE_KEY, tokenDataOnDisk);
    }

    async clearToken(): Promise<void> {
        await this.storage.delete(DiskTokenStorage.TOKEN_STORAGE_KEY);
    }

    async getToken(): Promise<TokenData> {
        const token = await this.readToken();
        if (!token) {
            throw new Error('Token not found');
        }
        return token;
    }
}