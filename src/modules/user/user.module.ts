import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/users.model';
import { UsersController } from './presentation/users.controller';
import { UsersService } from './application/users.service';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { IUSER_REPOSITORY } from './domain/repositories/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserRepository,
    {
      provide: IUSER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [UsersService, UserRepository, IUSER_REPOSITORY],
})
export class UserModule {}
