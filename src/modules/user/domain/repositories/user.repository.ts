import { User } from "../entities/users.model";

export const IUSER_REPOSITORY = "IUSER_REPOSITORY";

export interface IUserRepository {
    findAll(): Promise<User[]>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByEmailWithPassword(email: string): Promise<User | null>;
    findByRefreshToken(refreshToken: string): Promise<User | null>;
    saveUser(user: User): Promise<User>;
    createUserData(user: Partial<User>): Promise<User>;
    updateUserData(id: string, user: Partial<User>): Promise<void>;
    deleteUser(id: string): Promise<void>;
}
