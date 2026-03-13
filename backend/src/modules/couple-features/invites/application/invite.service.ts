import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { InviteRepository } from "../infrastructure/persistence/invite.repository";
import { Invite, InviteStatus } from "../domain/entities/invite.entity";
import * as crypto from "crypto";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";

@Injectable()
export class InviteService {
    private readonly logger = new Logger(InviteService.name);

    constructor(
        private readonly inviteRepository: InviteRepository,
        private readonly notificationsService: NotificationsService
    ) {}

    async createInvite(inviterId: string): Promise<Invite> {
        const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const invite = this.inviteRepository.create({
            inviterId,
            inviteCode,
            expiresAt
        });

        return this.inviteRepository.save(invite);
    }

    async validateInvite(inviteCode: string): Promise<Invite> {
        const invite = await this.inviteRepository.findOne({
            where: { inviteCode }
        });

        if (!invite) {
            throw new NotFoundException("Invite code not found");
        }

        if (invite.status !== InviteStatus.PENDING) {
            throw new BadRequestException("Invite code already used or expired");
        }

        if (invite.expiresAt < new Date()) {
            invite.status = InviteStatus.EXPIRED;
            await this.inviteRepository.save(invite);
            throw new BadRequestException("Invite code expired");
        }

        return invite;
    }

    async markAsUsed(inviteId: string) {
        const invite = await this.inviteRepository.findOne({
            where: { id: inviteId },
            select: ["id", "inviterId"]
        });
        if (!invite) {
            throw new NotFoundException("Invite not found");
        }

        await this.inviteRepository.update(inviteId, { status: InviteStatus.ACCEPTED });

        try {
            await this.notificationsService.createNotificationWithTimeWindow(
                invite.inviterId,
                "Loi moi da duoc chap nhan",
                "Mot loi moi ghep doi cua ban vua duoc chap nhan",
                "invite",
                900
            );
        } catch (error) {
            this.logger.warn(`Create invite notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }
}
