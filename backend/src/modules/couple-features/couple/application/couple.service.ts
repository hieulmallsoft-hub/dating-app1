import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from "@nestjs/common";
import { DataSource, IsNull, Not, Repository } from "typeorm";
import { CoupleRepository } from "../infrastructure/persistence/couple.repository";
import { Couple, CoupleStatus } from "../domain/entities/couple.entity";
import { UpdateCoupleDto } from "../presentation/dto/couple-ops.dto";
import { User } from "../../../common-user/user/domain/entities/user.entity";
import { LocationHistory } from "../../../common-user/user/domain/entities/location-history.entity";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";

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
        return {
            id: partner?.id ?? null,
            status: couple.status,
            birthDate: partner?.birthDate ? new Date(partner.birthDate).toISOString().slice(0, 10) : null,
            email: partner?.email ?? null,
            fullName: partner?.fullName ?? null
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

    async getCoupleLocationHistory(userId: string, limitInput?: number) {
        const couple = await this.getMyCouple(userId);
        const me = this.getMeFromCouple(couple, userId);
        const partner = this.getPartnerFromCouple(couple, userId);
        const limit = this.normalizeHistoryLimit(limitInput);
        const historyRepository = this.dataSource.getRepository(LocationHistory);

        const [myHistory, partnerHistory] = await Promise.all([
            me?.id
                ? historyRepository.find({
                      where: { userId: me.id },
                      order: { recordedAt: "DESC" },
                      take: limit
                  })
                : Promise.resolve([]),
            partner?.id
                ? historyRepository.find({
                      where: { userId: partner.id },
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
        return this.joinCoupleInternal(userId, this.normalizePartnerAccountCode(inviteCode), false);
    }

    async connectNew(userId: string, inviteCode: string) {
        return this.joinCoupleInternal(userId, this.normalizePartnerAccountCode(inviteCode), true);
    }

    async disconnect(userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const coupleRepo = manager.getRepository(Couple);
            const userRepo = manager.getRepository(User);

            await this.lockUsersForUpdate([userId], userRepo);

            const couple = await this.findActiveCoupleByUserId(userId, coupleRepo, true);
            if (!couple) {
                throw new NotFoundException("You are not in a couple");
            }

            couple.status = CoupleStatus.DISCONNECTED;
            return coupleRepo.save(couple);
        });
    }

    async updateCouple(userId: string, dto: UpdateCoupleDto) {
        const couple = await this.getMyCouple(userId);
        if (dto.startDate !== undefined) {
            couple.startDate = new Date(dto.startDate);
        }
        if (dto.theme !== undefined) {
            couple.theme = dto.theme;
        }
        return this.coupleRepository.save(couple);
    }

    private async joinCoupleInternal(userId: string, inviteCode: string, disconnectCurrent: boolean) {
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

            await this.lockUsersForUpdate([partner.id, userId], userRepo);

            const partnerCouple = await this.findActiveCoupleByUserId(partner.id, coupleRepo);
            if (partnerCouple) {
                throw new ConflictException("Partner is already in a couple");
            }

            const myCurrentCouple = await this.findActiveCoupleByUserId(userId, coupleRepo);
            if (myCurrentCouple && !disconnectCurrent) {
                throw new ConflictException("You are already in a couple");
            }

            if (myCurrentCouple && disconnectCurrent) {
                myCurrentCouple.status = CoupleStatus.DISCONNECTED;
                await coupleRepo.save(myCurrentCouple);
            }

            const couple = coupleRepo.create({
                user1Id: partner.id,
                user2Id: userId,
                status: CoupleStatus.ACTIVE
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
            lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null
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
            createdAt: new Date(pointTime).toISOString()
        };
    }

    private normalizeHistoryLimit(limitInput?: number) {
        if (typeof limitInput !== "number" || Number.isNaN(limitInput)) {
            return 120;
        }
        return Math.max(1, Math.min(500, Math.floor(limitInput)));
    }

    private async notifyPairingSuccess(inviterId: string, partnerId: string) {
        const tasks: Promise<unknown>[] = [];
        tasks.push(
            this.notificationsService.createNotification(
                inviterId,
                "Ghep doi thanh cong",
                "Ban va doi cua ban da ket noi thanh cong",
                "couple"
            )
        );
        tasks.push(
            this.notificationsService.createNotification(
                partnerId,
                "Ghep doi thanh cong",
                "Ban va doi cua ban da ket noi thanh cong",
                "couple"
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



