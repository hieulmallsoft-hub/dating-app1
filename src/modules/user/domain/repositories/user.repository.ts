import { User } from '../entities/users.model';

/**
 * IUserRepository: Lớp Domain (Business Core).
 * Interface định nghĩa các hành vi của User repository.
 * Giúp module domain không phụ thuộc trực tiếp vào DB tech (TypeORM, v.v.).
 */
export interface IUserRepository {
  findAll(): Promise<User[]>;
  findById(id: number): Promise<User | null>;
  create(user: Partial<User>): Promise<User>;
  update(id: number, user: Partial<User>): Promise<void>;
  delete(id: number): Promise<void>;
}
