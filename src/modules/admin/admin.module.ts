import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './domain/entities/admin.model';
import { AdminService } from './application/admin.service';
import { AdminRepository } from './infrastructure/persistence/admin.repository';
import { AdminController } from './presentation/admin.controller';
import { UserModule } from '../user/user.module';
import { AdminUsersController } from './presentation/admin-users.controller';
import { CoupleModule } from '../couple/couple.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    UserModule,
    CoupleModule,
  ],
  controllers: [AdminUsersController, AdminController], // Register specific routes FIRST
  providers: [AdminService, AdminRepository],
  exports: [AdminService],
})
export class AdminModule {}
