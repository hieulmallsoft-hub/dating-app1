import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { CreateUserDto } from "../presentation/dto/create-user.dto";
import { IUserRepository, IUSER_REPOSITORY } from "../domain/repositories/user.repository";

@Injectable()
export class UsersService {
    constructor(
        @Inject(IUSER_REPOSITORY)
        private readonly userRepository: IUserRepository
    ) {}

    getAllUsers() {
        return this.userRepository.findAll();
    }

    async getUserById(id: string) {
        const user = await this.userRepository.findById(id);
        if (!user) throw new NotFoundException("User not found");
        return user;
    }

    async getUserByEmail(email: string) {
        return this.userRepository.findByEmail(email);
    }

    async getUserWithPassword(email: string) {
        return this.userRepository.findByEmailWithPassword(email);
    }

    async createUser(dto: CreateUserDto) {
        const existed = await this.userRepository.findByEmail(dto.email);
        if (existed) throw new ConflictException("Email already exists");

        const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null;

        const newUser = await this.userRepository.createUserData({
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
            socialId: (dto as any).socialId,
            provider: (dto as any).provider
        });

        const saved = await this.userRepository.saveUser(newUser);

        return {
            id: saved.id,
            email: saved.email,
            fullName: saved.fullName,
            role: saved.role,
            provider: saved.provider,
            socialId: saved.socialId
        } as any;
    }

    async updateUser(id: string, dto: any) {
        const existed = await this.userRepository.findById(id);
        if (!existed) throw new NotFoundException("User not found");

        if ("role" in dto) throw new BadRequestException("Cannot update role");

        if (dto.password) {
            dto.password = await bcrypt.hash(dto.password, 10);
        }

        if (dto.email && dto.email !== existed.email) {
            const emailTaken = await this.userRepository.findByEmail(dto.email);
            if (emailTaken) throw new ConflictException("Email already exists");
        }

        await this.userRepository.updateUserData(id, dto);
        return this.getUserById(id);
    }

    async deleteUser(id: string) {
        const existed = await this.userRepository.findById(id);
        if (!existed) throw new NotFoundException("User not found");

        await this.userRepository.deleteUser(id);
        return { message: "User deleted successfully" };
    }

    // --- Admin features ---
    async banUser(id: string) {
        const user = await this.userRepository.findById(id);
        if (!user) throw new NotFoundException("User not found");

        user.isActive = !user.isActive;
        await this.userRepository.saveUser(user);

        return {
            message: user.isActive ? "User unbanned successfully" : "User banned successfully",
            isActive: user.isActive
        };
    }

    async getUserDetailForAdmin(id: string) {
        const user = await this.userRepository.findById(id);
        if (!user) throw new NotFoundException("User not found");
        return user;
    }

    async updateRefreshToken(id: string, refreshToken: string, refreshTokenExp: Date) {
        await this.userRepository.updateUserData(id, {
            refreshToken,
            refreshTokenExp
        });
    }

    async getUserByRefreshToken(refreshToken: string) {
        return this.userRepository.findByRefreshToken(refreshToken);
    }
}
