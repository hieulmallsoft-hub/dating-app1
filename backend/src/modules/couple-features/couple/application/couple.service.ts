import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from "@nestjs/common";
import {
    Between,
    DataSource,
    FindOptionsWhere,
    IsNull,
    LessThanOrEqual,
    MoreThanOrEqual,
    Not,
    Repository
} from "typeorm";
import { CoupleRepository } from "../infrastructure/persistence/couple.repository";
import { Couple, CoupleStatus } from "../domain/entities/couple.entity";
import { UpdateCoupleDto } from "../presentation/dto/couple-ops.dto";
import { User } from "../../../common-user/user/domain/entities/user.entity";
import { LocationHistory, LocationSource } from "../../../common-user/user/domain/entities/location-history.entity";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";

@Injectable()
export class CoupleService {
    private readonly logger = new Logger(CoupleService.name);

    constructor(
        private readonly coupleRepository: CoupleRepository,
        private readonly dataSource: DataSource,
        private readonly notificationsService: NotificationsService
    ) {}

    async getMyCouple(userId: string): Promise<Couple> {
        const couple = await this.findActiveCoupleByUserId(userId, this.coupleRepository, true);

        if (!couple) {
            throw new NotFoundException("You are not in a couple");
        }

        return couple;
    }

    async getMyCoupleWithPartner(userId: string): Promise<Couple & { partner: User | null }> {
        const couple = await this.getMyCouple(userId);
        return {
            ...couple,
            partner: this.getPartnerFromCouple(couple, userId)
        };
    }

    async getMyCoupleProfile(userId: string) {
        const couple = await this.getMyCouple(userId);
        const partner = this.getPartnerFromCouple(couple, userId);
        const partnerAccountCode =
            typeof partner?.accountCode === "string" && partner.accountCode.trim().length > 0
                ? partner.accountCode.trim()
                : null;
        const partnerGender =
            partner?.gender === 0 || partner?.gender === 1 || partner?.gender === 2
                ? (partner.gender as 0 | 1 | 2)
                : null;

        return {
            id: partner?.id ?? null,
            email: partner?.email ?? null,
            accountCode: partnerAccountCode,
            inviteCode: partnerAccountCode,
            fullName: partner?.fullName ?? null,
            gender: partnerGender,
            birthDate: partner?.birthDate ? new Date(partner.birthDate).toISOString().slice(0, 10) : null,
            startDate: couple.startDate ? new Date(couple.startDate).toISOString().slice(0, 10) : null,
            startDateAt: couple.startDateAt ? new Date(couple.startDateAt).toISOString() : null,
            avatar: partner?.avatar ?? null,
            latitude:
                partner?.latitude !== null && partner?.latitude !== undefined
                    ? Number(partner.latitude)
                    : null,
            longitude:
                partner?.longitude !== null && partner?.longitude !== undefined
                    ? Number(partner.longitude)
                    : null,
            status: couple.status
        };
    }

    async getCoupleLocations(userId: string) {
        const couple = await this.getMyCouple(userId);
        const me = this.getMeFromCouple(couple, userId);
        const partner = this.getPartnerFromCouple(couple, userId);

        return {
            me: this.toUserLocation(me),
            partner: this.toUserLocation(partner)
        };
    }

    async getCoupleLocationHistory(
        userId: string,
        limitInput?: number,
        fromInput?: number,
        toInput?: number
    ) {
        const couple = await this.getMyCouple(userId);
        const me = this.getMeFromCouple(couple, userId);
        const partner = this.getPartnerFromCouple(couple, userId);
        const limit = this.normalizeHistoryLimit(limitInput);
        const { from, to } = this.normalizeHistoryRange(fromInput, toInput);
        const historyRepository = this.dataSource.getRepository(LocationHistory);

        const buildWhere = (targetUserId: string): FindOptionsWhere<LocationHistory> & { recordedAt?: any } => {
            const where: FindOptionsWhere<LocationHistory> & { recordedAt?: any } = {
                userId: targetUserId,
                coupleId: couple.id
            };

            if (from && to) {
                where.recordedAt = Between(from, to);
            } else if (from) {
                where.recordedAt = MoreThanOrEqual(from);
            } else if (to) {
                where.recordedAt = LessThanOrEqual(to);
            }

            return where;
        };

        const [myHistory, partnerHistory] = await Promise.all([
            me?.id
                ? historyRepository.find({
                      where: buildWhere(me.id),
                      order: { recordedAt: "DESC" },
                      take: limit
                  })
                : Promise.resolve([]),
            partner?.id
                ? historyRepository.find({
                      where: buildWhere(partner.id),
                      order: { recordedAt: "DESC" },
                      take: limit
                  })
                : Promise.resolve([])
        ]);

        return {
            me: [...myHistory].reverse().map((entry) => this.toHistoryPoint(entry)),
            partner: [...partnerHistory].reverse().map((entry) => this.toHistoryPoint(entry))
        };
    }

    async joinCouple(userId: string, inviteCode: string) {
        return this.joinCoupleInternal(userId, this.normalizePartnerAccountCode(inviteCode));
    }

    async disconnect(userId: string) {
        const result = await this.dataSource.transaction(async (manager) => {
            const coupleRepo = manager.getRepository(Couple);
            const userRepo = manager.getRepository(User);

            await this.lockUsersForUpdate([userId], userRepo);

            const couple = await this.findActiveCoupleByUserId(userId, coupleRepo, true);
            if (!couple) {
                throw new NotFoundException("You are not in a couple");
            }

            const partnerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;
            couple.status = CoupleStatus.DISCONNECTED;
            const saved = await coupleRepo.save(couple);
            return { couple: saved, partnerId };
        });

        await this.notifyDisconnect(result.partnerId);
        return result.couple;
    }

    async updateCouple(userId: string, dto: UpdateCoupleDto): Promise<Couple> {
        const result: { couple: Couple; partnerId: string | null; startDateUpdated: boolean } =
            await this.dataSource.transaction(async (manager) => {
            const coupleRepo = manager.getRepository(Couple);
            const userRepo = manager.getRepository(User);
            const couple = await this.findActiveCoupleByUserId(userId, coupleRepo);

            if (!couple) {
                throw new NotFoundException("You are not in a couple");
            }

            const lockIds: string[] = [couple.user1Id];
            if (couple.user2Id) {
                lockIds.push(couple.user2Id);
            }
            await this.lockUsersForUpdate(lockIds, userRepo);

            const lockedCouple = await this.findActiveCoupleByUserId(userId, coupleRepo);
            if (!lockedCouple) {
                throw new NotFoundException("You are not in a couple");
            }

            const partnerId = lockedCouple.user1Id === userId ? lockedCouple.user2Id : lockedCouple.user1Id;

            if (dto.startDate === undefined) {
                return { couple: lockedCouple, partnerId, startDateUpdated: false };
            }

            if (typeof dto.updateTime !== "string" || dto.updateTime.trim().length === 0) {
                throw new BadRequestException("updateTime is required when updating startDate");
            }

            const incomingUpdateTime = new Date(dto.updateTime);
            if (Number.isNaN(incomingUpdateTime.getTime())) {
                throw new BadRequestException("updateTime is invalid");
            }

            if (lockedCouple.startDateAt && incomingUpdateTime.getTime() <= new Date(lockedCouple.startDateAt).getTime()) {
                throw new ConflictException("Stale updateTime");
            }

            lockedCouple.startDate = new Date(dto.startDate);
            lockedCouple.startDateAt = incomingUpdateTime;
            const saved = await coupleRepo.save(lockedCouple);
            return { couple: saved, partnerId, startDateUpdated: true };
        });

        if (result.startDateUpdated) {
            await this.notifyStartDateUpdated(result.partnerId, result.couple.startDate);
        }

        return result.couple;
    }

    private async joinCoupleInternal(userId: string, inviteCode: string) {
        const result = await this.dataSource.transaction(async (manager) => {
            const coupleRepo = manager.getRepository(Couple);
            const userRepo = manager.getRepository(User);
            const partner = await userRepo.findOne({
                where: { accountCode: inviteCode },
                select: ["id", "accountCode"]
            });

            if (!partner) {
                throw new NotFoundException("Account code not found");
            }

            if (partner.id === userId) {
                throw new BadRequestException("You cannot connect using your own account code");
            }
            //Khóa 2 user để tránh join trùng cùng lúc với 1 partner      
            await this.lockUsersForUpdate([partner.id, userId], userRepo);

            const partnerCouple = await this.findActiveCoupleByUserId(partner.id, coupleRepo);
            if (partnerCouple) {
                throw new ConflictException("Partner is already in a couple");
            }

            const myCurrentCouple = await this.findActiveCoupleByUserId(userId, coupleRepo);
            if (myCurrentCouple) {
                throw new ConflictException("You are already in a couple");
            }

            const couple = coupleRepo.create({
                user1Id: partner.id,
                user2Id: userId,
                status: CoupleStatus.ACTIVE,
                startDate: new Date(),
                startDateAt: null
            });

            await coupleRepo.save(couple);

            return {
                couple,
                partnerId: partner.id
            };
        });

        await this.notifyPairingSuccess(result.partnerId, userId);
        return result.couple;
    }

    private normalizePartnerAccountCode(inviteCode: string) {
        const normalizedCode = inviteCode.trim();

        if (!/^[0-9]{6}$/.test(normalizedCode)) {
            throw new BadRequestException("Account code format is invalid");
        }

        return normalizedCode;
    }

    private async lockUsersForUpdate(userIds: string[], userRepo: Repository<User>) {
        const uniqueUserIds = Array.from(new Set(userIds)).sort();

        await userRepo
            .createQueryBuilder("user")
            .select(["user.id"])
            .where("user.id IN (:...userIds)", { userIds: uniqueUserIds })
            .orderBy("user.id", "ASC")
            .setLock("pessimistic_write")
            .getMany();
    }

    private getPartnerFromCouple(couple: Couple, userId: string): User | null {
        if (couple.user1Id === userId) {
            return couple.user2 ?? null;
        }

        if (couple.user2Id === userId) {
            return couple.user1 ?? null;
        }

        return null;
    }

    private getMeFromCouple(couple: Couple, userId: string): User | null {
        if (couple.user1Id === userId) {
            return couple.user1 ?? null;
        }

        if (couple.user2Id === userId) {
            return couple.user2 ?? null;
        }

        return null;
    }

    private toUserLocation(user: User | null) {
        if (!user) return null;

        return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            avatar: user.avatar,
            latitude: user.latitude !== null && user.latitude !== undefined ? Number(user.latitude) : null,
            longitude: user.longitude !== null && user.longitude !== undefined ? Number(user.longitude) : null,
            lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null,
            batteryLevel: user.batteryLevel !== null && user.batteryLevel !== undefined ? user.batteryLevel : null,
            isCharging: user.isCharging !== null && user.isCharging !== undefined ? user.isCharging : null,
            speed: user.speed !== null && user.speed !== undefined ? Number(user.speed) : null
        };
    }

    private toHistoryPoint(entry: LocationHistory) {
        const pointTime = entry.recordedAt ?? entry.createdAt ?? new Date();
        return {
            id: entry.id,
            userId: entry.userId,
            latitude: Number(entry.latitude),
            longitude: Number(entry.longitude),
            accuracy:
                entry.accuracy !== null && entry.accuracy !== undefined
                    ? Number(entry.accuracy)
                    : null,
            createdAt: new Date(pointTime).toISOString(),
            recordedAt: new Date(pointTime).toISOString(),
            speed: entry.speed !== null && entry.speed !== undefined ? Number(entry.speed) : null,
            heading: entry.heading !== null && entry.heading !== undefined ? Number(entry.heading) : null,
            source: entry.source ?? LocationSource.REALTIME
        };
    }

    private normalizeHistoryLimit(limitInput?: number) {
        if (typeof limitInput !== "number" || Number.isNaN(limitInput)) {
            return 120;
        }
        return Math.max(1, Math.min(500, Math.floor(limitInput)));
    }

    private normalizeHistoryRange(fromInput?: number, toInput?: number) {
        const from = this.toOptionalDate(fromInput, "from");
        const to = this.toOptionalDate(toInput, "to");

        if (!from && !to) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return { from: thirtyDaysAgo, to: now };
        }

        if (from && to && from.getTime() > to.getTime()) {
            throw new BadRequestException("from must be less than or equal to to");
        }

        return { from, to };
    }

    private toOptionalDate(value: number | undefined, field: "from" | "to") {
        if (value === undefined) {
            return null;
        }

        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new BadRequestException(`${field} must be a valid epoch milliseconds number`);
        }

        if (value < 0) {
            throw new BadRequestException(`${field} must be greater than or equal to 0`);
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new BadRequestException(`${field} is invalid`);
        }

        return parsed;
    }

    private async notifyPairingSuccess(inviterId: string, partnerId: string) {
        const tasks: Promise<unknown>[] = [];
        tasks.push(
            this.notificationsService.createNotification(
                inviterId,
                "Ghep doi thanh cong",
                "Ban va doi cua ban da ket noi thanh cong",
                NotificationType.COUPLE
            )
        );
        tasks.push(
            this.notificationsService.createNotification(
                partnerId,
                "Ghep doi thanh cong",
                "Ban va doi cua ban da ket noi thanh cong",
                NotificationType.COUPLE
            )
        );

        const results = await Promise.allSettled(tasks);
        for (const result of results) {
            if (result.status === "rejected") {
                this.logger.warn(
                    `Create couple notification failed: ${(result.reason as Error)?.message || "unknown"}`
                );
            }
        }
    }

    private async notifyDisconnect(partnerId: string | null) {
        if (!partnerId) return;

        try {
            await this.notificationsService.createNotification(
                partnerId,
                "Cap nhat ghep doi",
                "Doi cua ban vua ngat ket noi ghep doi",
                NotificationType.COUPLE_DISCONNECT
            );
        } catch (error) {
            this.logger.warn(`Create disconnect notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }

    private async notifyStartDateUpdated(partnerId: string | null, startDate?: Date | null) {
        if (!partnerId) return;

        const normalizedDate =
            startDate instanceof Date && !Number.isNaN(startDate.getTime())
                ? startDate.toISOString().slice(0, 10)
                : null;
        const content = normalizedDate
            ? `Doi cua ban vua cap nhat ngay bat dau: ${normalizedDate}`
            : "Doi cua ban vua cap nhat ngay bat dau";

        try {
            await this.notificationsService.createNotification(
                partnerId,
                "Cap nhat ghep doi",
                content,
                NotificationType.COUPLE_START_DATE
            );
        } catch (error) {
            this.logger.warn(`Create start-date notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }

    private findActiveCoupleByUserId(
        userId: string,
        repo: Repository<Couple> = this.coupleRepository,
        withRelations = false
    ) {
        return repo.findOne({
            where: [
                { user1Id: userId, user2Id: Not(IsNull()), status: CoupleStatus.ACTIVE },
                { user2Id: userId, status: CoupleStatus.ACTIVE }
            ],
            relations: withRelations ? ["user1", "user2"] : undefined
        });
    }
}




