import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { CreateUserDto } from "../presentation/dto/create-user.dto";
import { UserRepository } from "../infrastructure/persistence/user.repository";

@Injectable()
export class UsersService {
    constructor(
        private readonly userRepository: UserRepository
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

        return this.userRepository.createAndSave({
            email: dto.email,
            fullName: dto.fullName,
            password: passwordHash,
            tokenVersion: 0,
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

        await this.userRepository.updateById(id, dto);
        return this.getUserById(id);
    }

    async deleteUser(id: string) {
        const existed = await this.userRepository.findById(id);
        if (!existed) throw new NotFoundException("User not found");

        await this.userRepository.deleteById(id);
        return { message: "User deleted successfully" };
    }

    // --- Admin features ---
    async banUser(id: string) {
        const user = await this.userRepository.findById(id);
        if (!user) throw new NotFoundException("User not found");

        user.isActive = !user.isActive;
        await this.userRepository.save(user);

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

    async updateRefreshToken(id: string, refreshToken: string | null, refreshTokenExp: Date | null) {
        await this.userRepository.updateById(id, {
            refreshToken,
            refreshTokenExp
        });
    }

    async getUserByRefreshToken(refreshToken: string) {
        return this.userRepository.findByRefreshToken(refreshToken);
    }

    async replaceSession(id: string, refreshToken: string, refreshTokenExp: Date) {
        return this.userRepository.replaceSession(id, refreshToken, refreshTokenExp);
    }

    async rotateRefreshToken(
        id: string,
        currentRefreshToken: string,
        refreshToken: string,
        refreshTokenExp: Date
    ) {
        return this.userRepository.rotateRefreshToken(
            id,
            currentRefreshToken,
            refreshToken,
            refreshTokenExp
        );
    }

    async clearSession(id: string) {
        return this.userRepository.clearSession(id);
    }
}
