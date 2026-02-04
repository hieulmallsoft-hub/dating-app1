import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/users.model';

/**
 * UserRepository: Lớp Infrastructure.
 * Triển khai cụ thể việc truy xuất dữ liệu User bằng TypeORM.
 */
@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }
}
