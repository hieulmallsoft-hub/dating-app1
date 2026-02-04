import { Injectable } from '@nestjs/common';
import { AdminRepository } from '../infrastructure/persistence/admin.repository';
import * as bcrypt from 'bcrypt';
import { CreateAdminDto } from '../presentation/dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private adminRepository: AdminRepository) {}

  async createAdmin(adminData: CreateAdminDto) {
    const existed =  await this.adminRepository.findOne({ where: { email: adminData.email } });
    if(existed){
      throw new Error('Admin already exists');
    }
    if (adminData.password) {
      const salt = await bcrypt.genSalt();
      adminData.password = await bcrypt.hash(adminData.password, salt);
    }
    const admin = this.adminRepository.create(adminData);
    return await this.adminRepository.save(admin);
  }

  async getAllAdmins() {
    return this.adminRepository.find();
  }

  async getAdminById(id: string) {
    return this.adminRepository.findOne({ where: { id } });
  }

  async getAdminByEmail(email: string) {
    return this.adminRepository.findOne({ where: { email } });
  }
}
