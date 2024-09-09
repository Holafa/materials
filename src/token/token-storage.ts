import { TokenData } from './types';

export interface TokenStorage {
    setToken(tokenData: TokenData): Promise<void>;

    readToken(): Promise<TokenData | undefined>;

    clearToken(): Promise<void>;

    getToken(): Promise<TokenData>;
}