import { config } from 'dotenv';

config();

export function getEnvVariable(name: string, defaultValue: string | undefined = undefined) {
    const value = process.env[name];
    if (!value) {
        if (defaultValue) {
            return defaultValue
        } else {
            console.error(`${name} environment variable is not set`);
            process.exit(1);
        }
    }
    return value;
}

interface Config {
    STORAGE_PATH: string;
    RPC_URL: string;
    JITO_RPC_URL: string;
}

export const CONFIG: Config = {
    STORAGE_PATH: getEnvVariable('STORAGE_PATH'),
    RPC_URL: getEnvVariable('RPC_URL'),
    JITO_RPC_URL: getEnvVariable('JITO_RPC_URL'),
};
