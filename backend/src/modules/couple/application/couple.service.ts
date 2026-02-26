import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { CoupleRepository } from "../infrastructure/persistence/couple.repository";
import { InviteService } from "../../invites/application/invite.service";
import { Couple, CoupleStatus } from "../domain/entities/couple.entity";
import { Invite, InviteStatus } from "../../invites/domain/entities/invite.entity";
import { UpdateCoupleDto } from "../presentation/dto/couple-ops.dto";

@Injectable()
export class CoupleService {
    constructor(
        private readonly coupleRepository: CoupleRepository,
        private readonly inviteService: InviteService,
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
        // Check if already in a couple
        const existing = await this.findActiveCoupleByUserId(userId);
        if (existing) {
            throw new ConflictException("You are already in a couple");
        }

        const inviteRepo = this.dataSource.getRepository(Invite);
        const latestPendingInvite = await inviteRepo.findOne({
            where: { inviterId: userId, status: InviteStatus.PENDING },
            order: { createdAt: "DESC" }
        });

        if (latestPendingInvite) {
            if (latestPendingInvite.expiresAt >= new Date()) {
                return latestPendingInvite;
            }

            latestPendingInvite.status = InviteStatus.EXPIRED;
            await inviteRepo.save(latestPendingInvite);
        }

        return this.inviteService.createInvite(userId);
    }

    async joinCouple(userId: string, inviteCode: string) {
        return this.joinCoupleInternal(userId, inviteCode, false);
    }

    async connectNew(userId: string, inviteCode: string) {
        return this.joinCoupleInternal(userId, inviteCode, true);
    }

    async disconnect(userId: string) {
        const couple = await this.getMyCouple(userId);
        couple.status = CoupleStatus.DISCONNECTED;
        return this.coupleRepository.save(couple);
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

            const invite = await inviteRepo
                .createQueryBuilder("invite")
                .setLock("pessimistic_write")
                .where("invite.inviteCode = :inviteCode", { inviteCode })
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

            return couple;
        });
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
