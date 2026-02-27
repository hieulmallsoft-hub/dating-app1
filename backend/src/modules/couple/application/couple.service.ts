import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import * as crypto from "crypto";
import { DataSource, Repository } from "typeorm";
import { CoupleRepository } from "../infrastructure/persistence/couple.repository";
import { Couple, CoupleStatus } from "../domain/entities/couple.entity";
import { Invite, InviteStatus } from "../../invites/domain/entities/invite.entity";
import { UpdateCoupleDto } from "../presentation/dto/couple-ops.dto";
import { User } from "../../user/domain/entities/users.model";

@Injectable()
export class CoupleService {
    constructor(
        private readonly coupleRepository: CoupleRepository,
        private readonly dataSource: DataSource
    ) {}

    async getMyCouple(userId: string): Promise<Couple> {
        const couple = await this.findActiveCoupleByUserId(userId, this.coupleRepository, true);

        if (!couple) {
            throw new NotFoundException("You are not in a couple");
        }

        return couple;
    }

    async createInvite(userId: string) {
        return this.dataSource.transaction(async (manager) => {
            const coupleRepo = manager.getRepository(Couple);
            const inviteRepo = manager.getRepository(Invite);
            const userRepo = manager.getRepository(User);

            await this.lockUsersForUpdate([userId], userRepo);

            const existing = await this.findActiveCoupleByUserId(userId, coupleRepo);
            if (existing) {
                throw new ConflictException("You are already in a couple");
            }

            const now = new Date();
            const pendingInvites = await inviteRepo.find({
                where: { inviterId: userId, status: InviteStatus.PENDING },
                order: { createdAt: "DESC" }
            });

            let reusableInvite: Invite | null = null;
            for (const pendingInvite of pendingInvites) {
                if (!reusableInvite && pendingInvite.expiresAt >= now) {
                    reusableInvite = pendingInvite;
                    continue;
                }

                pendingInvite.status = InviteStatus.EXPIRED;
                await inviteRepo.save(pendingInvite);
            }

            if (reusableInvite) {
                return reusableInvite;
            }

            return this.createInviteRecord(userId, inviteRepo);
        });
    }

    async joinCouple(userId: string, inviteCode: string) {
        return this.joinCoupleInternal(userId, this.normalizeInviteCode(inviteCode), false);
    }

    async connectNew(userId: string, inviteCode: string) {
        return this.joinCoupleInternal(userId, this.normalizeInviteCode(inviteCode), true);
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
        return this.dataSource.transaction(async (manager) => {
            const coupleRepo = manager.getRepository(Couple);
            const inviteRepo = manager.getRepository(Invite);
            const userRepo = manager.getRepository(User);

            const invite = await inviteRepo
                .createQueryBuilder("invite")
                .setLock("pessimistic_write")
                .where("invite.inviteCode = :inviteCode", { inviteCode })
                .andWhere("invite.status = :status", { status: InviteStatus.PENDING })
                .getOne();

            if (!invite) {
                throw new NotFoundException("Invite code not found");
            }

            if (invite.status !== InviteStatus.PENDING) {
                throw new BadRequestException("Invite code already used or expired");
            }

            if (invite.expiresAt < new Date()) {
                invite.status = InviteStatus.EXPIRED;
                await inviteRepo.save(invite);
                throw new BadRequestException("Invite code expired");
            }

            if (invite.inviterId === userId) {
                throw new BadRequestException("You cannot join your own invite");
            }

            await this.lockUsersForUpdate([invite.inviterId, userId], userRepo);

            const inviterCouple = await this.findActiveCoupleByUserId(invite.inviterId, coupleRepo);
            if (inviterCouple) {
                throw new ConflictException("Inviter is already in a couple");
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
                user1Id: invite.inviterId,
                user2Id: userId,
                status: CoupleStatus.ACTIVE
            });

            await coupleRepo.save(couple);

            const consumeResult = await inviteRepo.update(
                { id: invite.id, status: InviteStatus.PENDING },
                { status: InviteStatus.ACCEPTED }
            );

            if (consumeResult.affected !== 1) {
                throw new ConflictException("Invite code already used");
            }

            await inviteRepo
                .createQueryBuilder()
                .update(Invite)
                .set({ status: InviteStatus.EXPIRED })
                .where("status = :status", { status: InviteStatus.PENDING })
                .andWhere("inviterId IN (:...userIds)", { userIds: [invite.inviterId, userId] })
                .execute();

            return couple;
        });
    }

    private normalizeInviteCode(inviteCode: string) {
        const normalizedCode = inviteCode.trim().toUpperCase();

        if (!/^[A-F0-9]{8}$/.test(normalizedCode)) {
            throw new BadRequestException("Invite code format is invalid");
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

    private async createInviteRecord(inviterId: string, inviteRepo: Repository<Invite>) {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const invite = inviteRepo.create({
                inviterId,
                inviteCode: crypto.randomBytes(4).toString("hex").toUpperCase(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });

            try {
                return await inviteRepo.save(invite);
            } catch (error) {
                if ((error as { code?: string }).code !== "23505") {
                    throw error;
                }
            }
        }

        throw new ConflictException("Could not generate a unique invite code");
    }

    private findActiveCoupleByUserId(
        userId: string,
        repo: Repository<Couple> = this.coupleRepository,
        withRelations = false
    ) {
        return repo.findOne({
            where: [
                { user1Id: userId, status: CoupleStatus.ACTIVE },
                { user2Id: userId, status: CoupleStatus.ACTIVE }
            ],
            relations: withRelations ? ["user1", "user2"] : undefined
        });
    }
}
