import fs from 'fs/promises';
import path from 'path';
import { DiskStorage } from './disk-storage';

export class JsonFileDiskStorage implements DiskStorage {
    readonly storageDir: string;

    constructor(storageDir: string) {
        this.storageDir = storageDir;
    }

    private getFilePath(key: string): string {
        return path.join(this.storageDir, `${key}.json`);
    }

    async save<T>(key: string, value: T): Promise<void> {
        const filePath = this.getFilePath(key);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        const data = JSON.stringify(value, null, 2);
        await fs.writeFile(filePath, data, 'utf8');
    }

    async load<T>(key: string): Promise<T | null> {
        const filePath = this.getFilePath(key);
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data) as T;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    async delete(key: string): Promise<void> {
        const filePath = this.getFilePath(key);
        try {
            await fs.unlink(filePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }
    }

    async exists(key: string): Promise<boolean> {
        const filePath = this.getFilePath(key);
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}
