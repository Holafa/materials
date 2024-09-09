import { Connection, clusterApiUrl } from '@solana/web3.js';
import { CONFIG } from './config';

export const connection = new Connection(CONFIG.RPC_URL || clusterApiUrl('mainnet-beta'), 'confirmed');
