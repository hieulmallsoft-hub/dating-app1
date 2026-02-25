import { Injectable } from "@nestjs/common";
import { AdminRepository } from "../infrastructure/persistence/admin.repository";
import * as bcrypt from "bcrypt";
import { CreateAdminDto } from "../presentation/dto/admin.dto";
import { UsersService } from "../../user/application/user.service";
import { CoupleRepository } from "../../couple/infrastructure/persistence/couple.repository";
import { UserRepository } from "../../user/infrastructure/persistence/user.repository";

@Injectable()
export class AdminService {
    constructor(
        private readonly adminRepository: AdminRepository,
        private readonly usersService: UsersService,
        private readonly coupleRepository: CoupleRepository,
        private readonly userRepository: UserRepository
    ) {}

    async getAllUsers() {
        return this.userRepository.find();
    }

    async setBanStatus(userId: string, isBanned: boolean) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new Error("User not found");
        user.isBanned = isBanned;
        return this.userRepository.save(user);
    }

    async getAllCouples() {
        return this.coupleRepository.find({ relations: ["user1", "user2"] });
    }

    async getStats() {
        const userCount = await this.userRepository.count();
        const coupleCount = await this.coupleRepository.count();
        return {
            totalUsers: userCount,
            totalCouples: coupleCount
        };
    }

    async createAdmin(adminData: CreateAdminDto) {
        const existed = await this.adminRepository.findOne({ where: { email: adminData.email } });
        if (existed) {
            throw new Error("Admin already exists");
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
