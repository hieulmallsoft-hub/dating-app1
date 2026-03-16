import { Injectable, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { MomentRepository } from "../infrastructure/persistence/moment.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { CreateMomentDto, UpdateMomentDto } from "../presentation/dto/moment-ops.dto";
import { Moment, MomentPrivacy } from "../domain/entities/moment.entity";
import { MediaService } from "../../media/application/media.service";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";

@Injectable()
export class MomentsService {
    private readonly logger = new Logger(MomentsService.name);

    constructor(
        private readonly momentRepository: MomentRepository,
        private readonly coupleService: CoupleService,
        private readonly mediaService: MediaService,
        private readonly notificationsService: NotificationsService
    ) {}

    async createMoment(userId: string, dto: CreateMomentDto) {
        const couple = await this.coupleService.getMyCouple(userId);

        const moment = this.momentRepository.create({
            ...dto,
            coupleId: couple.id,
            creatorId: userId
        });

        const savedMoment = await this.momentRepository.save(moment);

        // Sync photos to media album
        if (dto.photos && dto.photos.length > 0) {
            for (const photoUrl of dto.photos) {
                await this.mediaService.addMedia(userId, couple.id, photoUrl);
            }
        }

        if (savedMoment.privacy === MomentPrivacy.COUPLE && (!dto.photos || dto.photos.length === 0)) {
            await this.notifyPartnerForMoment(couple, userId, "created", savedMoment);
        }

        return savedMoment;
    }

    async getFeed(userId: string) {
        const couple = await this.coupleService.getMyCouple(userId);

        return this.momentRepository.find({
            where: { coupleId: couple.id },
            order: { createdAt: "DESC" }
        });
    }

    async updateMoment(userId: string, id: string, dto: UpdateMomentDto) {
        const moment = await this.momentRepository.findOne({ where: { id } });
        if (!moment) throw new NotFoundException("Moment not found");
        if (moment.creatorId !== userId) throw new ForbiddenException("Not your moment");

        const couple = await this.coupleService.getMyCouple(userId);
        Object.assign(moment, dto);
        const saved = await this.momentRepository.save(moment);

        if (saved.privacy === MomentPrivacy.COUPLE) {
            await this.notifyPartnerForMoment(couple, userId, "updated", saved);
        }

        return saved;
    }

    async deleteMoment(userId: string, id: string) {
        const moment = await this.momentRepository.findOne({ where: { id } });
        if (!moment) throw new NotFoundException("Moment not found");
        if (moment.creatorId !== userId) throw new ForbiddenException("Not your moment");

        const couple = await this.coupleService.getMyCouple(userId);
        const deletedSnapshot = {
            content: moment.content,
            photos: moment.photos,
            privacy: moment.privacy
        };
        await this.momentRepository.delete(id);

        if (deletedSnapshot.privacy === MomentPrivacy.COUPLE) {
            await this.notifyPartnerForMoment(couple, userId, "deleted", deletedSnapshot);
        }

        return { success: true };
    }

    private async notifyPartnerForMoment(
        couple: { user1Id: string; user2Id: string | null },
        actorId: string,
        action: "created" | "updated" | "deleted",
        moment: { content?: string | null; photos?: string[] | null }
    ) {
        const partnerId = couple.user1Id === actorId ? couple.user2Id : couple.user1Id;
        if (!partnerId) return;

        const trimmedContent = moment.content?.trim() || "";
        const photoCount = Array.isArray(moment.photos) ? moment.photos.length : 0;
        const preview = trimmedContent
            ? trimmedContent.length > 140
                ? `${trimmedContent.slice(0, 137)}...`
                : trimmedContent
            : photoCount > 0
              ? `Moment co ${photoCount} anh`
              : "Moment moi";

        let title = "Moment moi";
        let content = `Doi cua ban vua dang moment: ${preview}`;
        if (action === "updated") {
            title = "Moment da cap nhat";
            content = `Doi cua ban vua cap nhat moment: ${preview}`;
        } else if (action === "deleted") {
            title = "Moment da xoa";
            content = `Doi cua ban vua xoa mot moment`;
        }

        try {
            await this.notificationsService.createNotification(partnerId, title, content, NotificationType.MOMENT);
        } catch (error) {
            this.logger.warn(`Create moment notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }
}
