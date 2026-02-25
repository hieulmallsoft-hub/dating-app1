import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { User } from "../../domain/entities/users.model";
import { IUserRepository } from "../../domain/repositories/user.repository";

@Injectable()
export class UserRepository extends Repository<User> implements IUserRepository {
    constructor(private dataSource: DataSource) {
        super(User, dataSource.createEntityManager());
    }

    async findAll(): Promise<User[]> {
        return this.find();
    }

    async findById(id: string): Promise<User | null> {
        return this.findOne({ where: { id } as any });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.findOne({ where: { email } as any });
    }

    async findByEmailWithPassword(email: string): Promise<User | null> {
        return this.findOne({
            where: { email } as any,
            select: ["id", "email", "password", "fullName", "role"]
        });
    }

    async findByRefreshToken(refreshToken: string): Promise<User | null> {
        return this.findOne({ where: { refreshToken } as any });
    }

    async saveUser(user: User): Promise<User> {
        return this.save(user);
    }

    async createUserData(user: Partial<User>): Promise<User> {
        return this.create(user);
    }

    async updateUserData(id: string, user: Partial<User>): Promise<void> {
        await this.update(id, user as any);
    }

    async deleteUser(id: string): Promise<void> {
        await this.delete(id);
    }
}
