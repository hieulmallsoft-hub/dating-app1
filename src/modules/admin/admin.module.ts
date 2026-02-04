import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './domain/entities/admin.model';
import { AdminService } from './application/admin.service';
import { AdminRepository } from './infrastructure/persistence/admin.repository';
import { AdminController } from './presentation/admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Admin])],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService],
})
export class AdminModule {}
