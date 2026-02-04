import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from '../infrastructure/persistence/user.repository';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../presentation/dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  getAllUsers() {
    // Chỉ trả field an toàn (tuỳ entity bạn có gì)
    return this.userRepository.find({
      select: ['id', 'email', 'fullName', 'role'], // thêm field bạn muốn public
    });
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'fullName', 'role'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUserByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'fullName', 'role'],
    });
  }

  // Dùng cho login: cần password (vì thường select:false)
  async getUserWithPassword(email: string) {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'fullName', 'role'],
    });
  }

  async createUser(dto: CreateUserDto) {
    const existed = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existed) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser = this.userRepository.create({
      email: dto.email,
      fullName: dto.fullName,
      password: passwordHash,
      phoneNumber: dto.phoneNumber,
      birthDate: dto.birthDate,
      gender: dto.gender,
      genderPreference: dto.genderPreference,
      bio: dto.bio,
      photos: dto.photos,
      avatar: dto.avatar,
      // role nên set server-side (default USER), không lấy từ client
      // role: UserRole.USER,
    });

    const saved = await this.userRepository.save(newUser);

    // Không trả password
    return { id: saved.id, email: saved.email, fullName: saved.fullName, role: saved.role };
  }

  async updateUser(id: string, dto: any) {
    const existed = await this.userRepository.findOne({ where: { id } });
    if (!existed) throw new NotFoundException('User not found');

    // Chặn client tự update role (trừ khi bạn làm admin route)
    if ('role' in dto) throw new BadRequestException('Cannot update role');

    // Nếu update password → hash
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    // Nếu update email → check unique
    if (dto.email && dto.email !== existed.email) {
      const emailTaken = await this.userRepository.findOne({ where: { email: dto.email } });
      if (emailTaken) throw new ConflictException('Email already exists');
    }

    await this.userRepository.update(id, dto);
    return this.getUserById(id);
  }

  async deleteUser(id: string) {
    const existed = await this.userRepository.findOne({ where: { id } });
    if (!existed) throw new NotFoundException('User not found');

    await this.userRepository.delete(id);
    return { message: 'User deleted successfully' };
  }

  // --- Admin features ---
  async banUser(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Toggle ban status (if active -> inactive, if inactive -> active)
    user.isActive = !user.isActive;
    await this.userRepository.save(user);
    
    return { 
      message: user.isActive ? 'User unbanned successfully' : 'User banned successfully', 
      isActive: user.isActive 
    };
  }

  async getUserDetailForAdmin(id: string) {
    const user = await this.userRepository.findOne({ 
      where: { id },
      // Select all fields explicitly or implicitly. 
      // Password is hidden by default in entity (@Column({ select: false })).
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
