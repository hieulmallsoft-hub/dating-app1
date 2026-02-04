import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/users.model';
import UserController from './presentation/user.controller';
import { UsersService } from './application/users.service';
import { UserRepository } from './infrastructure/persistence/user.repository';

/**
 * UserModule: Module quản lý người dùng.
 * Tuân thủ Clean Architecture với các lớp: Presentation, Application, Domain, Infrastructure.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UsersService, UserRepository],
  exports: [UsersService],
})
export class UserModule {}
