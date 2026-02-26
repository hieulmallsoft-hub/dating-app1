import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { User } from "../../domain/entities/users\.model";


@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private readonly dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  // ===== Queries =====
  findAll(): Promise<User[]> {
    return this.find();
  }

  findById(id: string): Promise<User | null> {
    return this.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  /**
   * Chỉ dùng cho auth (cần password).
   * Lưu ý: nếu entity của bạn có @Exclude password hoặc select:false thì select như này là đúng.
   */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.findOne({
      where: { email },
      select: ["id", "email", "password", "fullName", "role", "refreshToken", "refreshTokenExp"], // thêm nếu bạn cần
    });
  }

  findByRefreshToken(refreshToken: string): Promise<User | null> {
    return this.findOne({ where: { refreshToken } });
  }

  // ===== Commands =====
  async createAndSave(data: Partial<User>): Promise<User> {
    const entity = this.create(data);
    return this.save(entity); // create() chỉ tạo object, save() mới ghi DB
  }

  async updateById(id: string, data: Partial<User>): Promise<void> {
    await this.update({ id }, data);
  }

  async deleteById(id: string): Promise<void> {
    await this.delete({ id });
  }
}