import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { DataSource, In, IsNull, Not } from "typeorm";
import { CreateUserDto } from "../presentation/dto/create-user.dto";
import { UpdateUserDto } from "../presentation/dto/update-user.dto";
import { UserRepository } from "../infrastructure/persistence/user.repository";
import { LocationHistoryRepository } from "../infrastructure/persistence/location-history.repository";
import { AuthProvider, User } from "../domain/entities/user.entity";
import { Couple, CoupleStatus } from "../../../couple-features/couple/domain/entities/couple.entity";
import { LocationSource } from "../domain/entities/location-history.entity";
import { Event } from "../../../couple-features/events/domain/entities/event.entity";
import { Moment } from "../../../couple-features/moments/domain/entities/moment.entity";
import { Place } from "../../../couple-features/places/domain/entities/place.entity";
import { Message } from "../../../couple-features/chat/domain/entities/message.entity";
import { Media } from "../../../couple-features/media/domain/entities/media.entity";
import { Trip } from "../../../couple-features/trips/domain/entities/trip.entity";
import { Invite } from "../../../couple-features/invites/domain/entities/invite.entity";
import { Notification } from "../../notifications/domain/entities/notification.entity";
import { Setting } from "../../settings/domain/entities/setting.entity";
import { SecuritySetting } from "../../security/domain/entities/security.entity";

type CreateUserPayload = CreateUserDto & {
    socialId?: string;
    sub?: string;
    provider?: AuthProvider;
};

type UpdateUserPayload = UpdateUserDto & {
    email?: string;
    password?: string;
    socialId?: string;
    sub?: string;
    provider?: AuthProvider;
};

@Injectable()
export class UsersService {
    private readonly accountCodeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private readonly accountCodeLength = 10;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly locationHistoryRepository: LocationHistoryRepository,
        private readonly dataSource: DataSource
    ) {}

    async getUserById(id: string) {
        const user = await this.userRepository.findById(id);
        if (!user) throw new NotFoundException("User not found");
        return user;
    }

    async getUserByEmail(email: string) {
        return this.userRepository.findByEmail(email);
    }

    async getUserByProviderAndSocialId(provider: AuthProvider, socialId: string) {
        return this.userRepository.findByProviderAndSocialId(provider, socialId);
    }

    async accountCodeExists(accountCode: string) {
        const normalizedCode = this.normalizeAccountCode(accountCode);
        if (!normalizedCode) {
            return false;
        }
        return this.userRepository.existsByAccountCode(normalizedCode);
    }

    async getUserWithPassword(email: string) {
        return this.userRepository.findByEmailWithPassword(email);
    }

    async createUser(dto: CreateUserPayload) {
        const existed = await this.userRepository.findByEmail(dto.email);
        if (existed) throw new ConflictException("Email already exists");

        const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null;
        const accountCode = await this.generateUniqueAccountCode();

        return this.userRepository.createAndSave({
            email: dto.email,
            accountCode,
            fullName: dto.fullName,
            password: passwordHash,
            tokenVersion: 0,
            phoneNumber: dto.phoneNumber,
            birthDate: dto.birthDate,
            gender: dto.gender,
            genderPreference: dto.genderPreference,
            bio: dto.bio,
            avatar: dto.avatar,
            socialId: dto.socialId,
            sub: dto.sub ?? dto.socialId,
            provider: dto.provider
        });
    }

    async updateUser(id: string, dto: UpdateUserPayload) {
        const existed = await this.userRepository.findById(id);
        if (!existed) throw new NotFoundException("User not found");

        const forbiddenKeys = [
            "role",
            "accountCode",
            "tokenVersion",
            "refreshToken",
            "refreshTokenExp",
            "isBanned",
            "isActive",
            "isVerified",
            "isPremium",
            "id",
            "createdAt",
            "updatedAt",
            "lastActiveAt"
        ] as const;

        const hasForbiddenField = forbiddenKeys.some((key) => key in dto);
        if (hasForbiddenField) {
            throw new BadRequestException("Cannot update protected fields");
        }

        const payload: UpdateUserPayload = { ...dto };

        if (payload.password) {
            payload.password = await bcrypt.hash(payload.password, 10);
        }

        if (payload.email && payload.email !== existed.email) {
            const emailTaken = await this.userRepository.findByEmail(payload.email);
            if (emailTaken) throw new ConflictException("Email already exists");
        }

        await this.userRepository.updateById(id, payload);
        return this.getUserById(id);
    }

    async updateMyLocation(
        id: string,
        latitude: number,
        longitude: number,
        accuracy?: number,
        batteryLevel?: number,
        isCharging?: boolean,
        speed?: number
    ) {
        const existed = await this.userRepository.findById(id);
        if (!existed) throw new NotFoundException("User not found");

        const nextLatitude = Number(latitude.toFixed(7));
        const nextLongitude = Number(longitude.toFixed(7));
        const nextAccuracy =
            typeof accuracy === "number" && Number.isFinite(accuracy)
                ? Number(Math.max(0, accuracy).toFixed(1))
                : null;
        const nextBatteryLevel =
            typeof batteryLevel === "number" && Number.isFinite(batteryLevel)
                ? Math.max(0, Math.min(100, Math.round(batteryLevel)))
                : undefined;
        const nextIsCharging = typeof isCharging === "boolean" ? isCharging : undefined;
        const nextSpeed =
            typeof speed === "number" && Number.isFinite(speed) ? Math.max(0, speed) : undefined;
        const now = new Date();

        const updatePayload: Record<string, unknown> = {
            latitude: nextLatitude,
            longitude: nextLongitude,
            lastActiveAt: now
        };

        if (nextBatteryLevel !== undefined) updatePayload.batteryLevel = nextBatteryLevel;
        if (nextIsCharging !== undefined) updatePayload.isCharging = nextIsCharging;
        if (nextSpeed !== undefined) updatePayload.speed = nextSpeed;

        await this.userRepository.updateById(id, updatePayload);

        const latest = await this.locationHistoryRepository.findOne({
            where: { userId: id },
            order: { recordedAt: "DESC" }
        });

        const shouldPersist =
            !latest ||
            this.distanceMeters(
                Number(latest.latitude),
                Number(latest.longitude),
                nextLatitude,
                nextLongitude
            ) >= 10 ||
            now.getTime() - new Date(latest.recordedAt).getTime() >= 30_000;

        if (shouldPersist) {
            const coupleId = await this.resolveActiveCoupleId(id);
            if (coupleId) {
                await this.locationHistoryRepository.save(
                    this.locationHistoryRepository.create({
                        userId: id,
                        coupleId,
                        latitude: nextLatitude,
                        longitude: nextLongitude,
                        accuracy: nextAccuracy,
                        speed: nextSpeed ?? null,
                        heading: null,
                        recordedAt: now,
                        source: LocationSource.REALTIME
                    })
                );
            }
        }

        return {
            userId: id,
            latitude: nextLatitude,
            longitude: nextLongitude,
            accuracy: nextAccuracy,
            batteryLevel: nextBatteryLevel ?? null,
            isCharging: nextIsCharging ?? null,
            speed: nextSpeed ?? null
        };
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

    async ensureAccountCode(id: string) {
        const existed = await this.userRepository.findById(id);
        if (!existed) throw new NotFoundException("User not found");

        if (existed.accountCode) {
            return existed;
        }

        const accountCode = await this.generateUniqueAccountCode();
        await this.userRepository.updateById(id, { accountCode });
        return this.getUserById(id);
    }

    private normalizeAccountCode(accountCode: string) {
        return typeof accountCode === "string" ? accountCode.trim().toUpperCase() : "";
    }

    private createAccountCodeCandidate() {
        let accountCode = "";
        for (let index = 0; index < this.accountCodeLength; index += 1) {
            const randomIndex = randomInt(0, this.accountCodeChars.length);
            accountCode += this.accountCodeChars[randomIndex];
        }
        return accountCode;
    }

    private async generateUniqueAccountCode() {
        for (let attempt = 0; attempt < 20; attempt += 1) {
            const accountCode = this.createAccountCodeCandidate();
            const existed = await this.userRepository.existsByAccountCode(accountCode);
            if (!existed) {
                return accountCode;
            }
        }

        throw new ConflictException("Unable to generate account code");
    }

    private distanceMeters(
        latitudeA: number,
        longitudeA: number,
        latitudeB: number,
        longitudeB: number
    ) {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const lat1 = toRad(latitudeA);
        const lat2 = toRad(latitudeB);
        const deltaLat = toRad(latitudeB - latitudeA);
        const deltaLon = toRad(longitudeB - longitudeA);

        const h =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) *
                Math.cos(lat2) *
                Math.sin(deltaLon / 2) *
                Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
        return 6_371_000 * c;
    }

    private async resolveActiveCoupleId(userId: string) {
        const coupleRepository = this.dataSource.getRepository(Couple);
        const couple = await coupleRepository.findOne({
            where: [
                { user1Id: userId, user2Id: Not(IsNull()), status: CoupleStatus.ACTIVE },
                { user2Id: userId, status: CoupleStatus.ACTIVE }
            ],
            select: ["id"]
        });
        return couple?.id || null;
    }

    async deleteUser(userId: string) {
        const existed = await this.userRepository.findById(userId);
        if (!existed) throw new NotFoundException("User not found");

        await this.dataSource.transaction(async (manager) => {
            const couples = await manager.getRepository(Couple).find({
                where: [{ user1Id: userId }, { user2Id: userId }],
                select: ["id"]
            });
            const coupleIds = couples.map((couple) => couple.id);

            if (coupleIds.length > 0) {
                await manager.getRepository(Message).delete({ coupleId: In(coupleIds) });
                await manager.getRepository(Event).delete({ coupleId: In(coupleIds) });
                await manager.getRepository(Moment).delete({ coupleId: In(coupleIds) });
                await manager.getRepository(Place).delete({ coupleId: In(coupleIds) });
                await manager.getRepository(Media).delete({ coupleId: In(coupleIds) });
                await manager.getRepository(Trip).delete({ coupleId: In(coupleIds) });
                await manager.getRepository(Couple).delete({ id: In(coupleIds) });
            }

            await manager.getRepository(Message).delete({ senderId: userId });
            await manager.getRepository(Event).delete({ creatorId: userId });
            await manager.getRepository(Moment).delete({ creatorId: userId });
            await manager.getRepository(Place).delete({ sharedBy: userId });
            await manager.getRepository(Media).delete({ uploaderId: userId });
            await manager.getRepository(Trip).delete({ userId });
            await manager.getRepository(Invite).delete({ inviterId: userId });
            await manager.getRepository(Notification).delete({ userId });
            await manager.getRepository(Setting).delete({ userId });
            await manager.getRepository(SecuritySetting).delete({ userId });
            await manager.getRepository(User).delete({ id: userId });
        });

        return { message: "User deleted successfully" };
    }
}
