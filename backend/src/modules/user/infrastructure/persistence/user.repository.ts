import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { User } from "../../domain/entities/users.enity";

@Injectable()
export class UserRepository extends Repository<User> {
    constructor(private readonly dataSource: DataSource) {
        super(User, dataSource.createEntityManager());
    }

    findAll(): Promise<User[]> {
        return this.find();
    }

    findById(id: string): Promise<User | null> {
        return this.findOne({ where: { id } });
    }

    findByEmail(email: string): Promise<User | null> {
        return this.findOne({ where: { email } });
    }

    findByEmailWithPassword(email: string): Promise<User | null> {
        return this.findOne({
            where: { email },
            select: [
                "id",
                "email",
                "password",
                "fullName",
                "role",
                "tokenVersion",
                "refreshToken",
                "refreshTokenExp"
            ]
        });
    }

    findByRefreshToken(refreshToken: string): Promise<User | null> {
        return this.findOne({ where: { refreshToken } });
    }

    async createAndSave(data: Partial<User>): Promise<User> {
        const entity = this.create(data);
        return this.save(entity);
    }

    async updateById(id: string, data: Partial<User>): Promise<void> {
        await this.update({ id }, data);
    }

    async deleteById(id: string): Promise<void> {
        await this.delete({ id });
    }

    async replaceSession(id: string, refreshToken: string, refreshTokenExp: Date): Promise<number> {
        const result = await this.createQueryBuilder()
            .update(User)
            .set({
                tokenVersion: () => 'COALESCE("tokenVersion", 0) + 1',
                refreshToken,
                refreshTokenExp
            })
            .where("id = :id", { id })
            .returning('"tokenVersion"')
            .execute();

        return Number(result.raw?.[0]?.tokenVersion ?? 0);
    }

    async rotateRefreshToken(
        id: string,
        currentRefreshToken: string,
        refreshToken: string,
        refreshTokenExp: Date
    ): Promise<boolean> {
        const result = await this.createQueryBuilder()
            .update(User)
            .set({
                refreshToken,
                refreshTokenExp
            })
            .where("id = :id", { id })
            .andWhere('"refreshToken" = :currentRefreshToken', { currentRefreshToken })
            .execute();

        return (result.affected ?? 0) > 0;
    }

    async clearSession(id: string): Promise<number> {
        const result = await this.createQueryBuilder()
            .update(User)
            .set({
                tokenVersion: () => 'COALESCE("tokenVersion", 0) + 1',
                refreshToken: null,
                refreshTokenExp: null
            })
            .where("id = :id", { id })
            .returning('"tokenVersion"')
            .execute();

        return Number(result.raw?.[0]?.tokenVersion ?? 0);
    }
}
