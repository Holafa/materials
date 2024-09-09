export interface DiskStorage {
    save<T>(key: string, value: T): Promise<void>;

    load<T>(key: string): Promise<T | null>;

    delete(key: string): Promise<void>;

    exists(key: string): Promise<boolean>;
}
