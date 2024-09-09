import { User } from './user';

export interface UserStorage {
    readUser(): Promise<User | undefined>;

    saveUser(userData: User): Promise<void>;
}