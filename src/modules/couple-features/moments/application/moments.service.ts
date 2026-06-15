import { Injectable, NotFoundException, ForbiddenException, Logger } from "@nestjs/common";
import { MomentRepository } from "../infrastructure/persistence/moment.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { CreateMomentDto, UpdateMomentDto } from "../presentation/dto/moment-ops.dto";
import { Moment, MomentPrivacy } from "../domain/entities/moment.entity";
import { MediaService } from "../../media/application/media.service";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";
import {
    getRequiredCoupleUserIds,
    mergeConfirmedUserIds,
    resolveSyncStatus,
    SyncPayloadStatus
} from "../../shared/sync-payload";

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
        const {
            isPrivate,
            privacy: legacyPrivacy,
            lat,
            lng,
            locationName,
            locationAddress,
            ...restDto
        } = dto;
        const normalizedIsPrivate = isPrivate ?? legacyPrivacy;

        const moment = this.momentRepository.create({
            ...restDto,
            latitude: lat ?? null,
            longitude: lng ?? null,
            locationName: locationName?.trim() || null,
            locationAddress: locationAddress?.trim() || null,
            privacy: this.toEntityPrivacy(normalizedIsPrivate),
            coupleId: couple.id,
            creatorId: userId,
            syncStatus: SyncPayloadStatus.UPLOADED,
            confirmedByUserIds: [userId]
        });

        const savedMoment = await this.momentRepository.save(moment);

        // Sync photos to media album
        if (dto.photos && dto.photos.length > 0) {
            await this.syncPhotosInBatches(userId, couple.id, dto.photos);
        }

        if (savedMoment.privacy === MomentPrivacy.COUPLE) {
            await this.notifyPartnerForMoment(couple, userId, "created", savedMoment);
        }

        return (await this.findMomentForResponse(savedMoment.id)) || savedMoment;
    }

    async getFeed(userId: string) {
        const couple = await this.coupleService.getMyCouple(userId);

        return this.momentRepository
            .createQueryBuilder("moment")
            .leftJoinAndSelect("moment.creator", "creator")
            .where("moment.coupleId = :coupleId", { coupleId: couple.id })
            .andWhere("(moment.privacy = :couplePrivacy OR moment.creatorId = :userId)", {
                couplePrivacy: MomentPrivacy.COUPLE,
                userId
            })
            .andWhere("(moment.syncStatus IS NULL OR moment.syncStatus <> :payloadDeleted)", {
                payloadDeleted: SyncPayloadStatus.PAYLOAD_DELETED
            })
            .select([
                "moment.id",
                "moment.creatorId",
                "moment.content",
                "moment.photos",
                "moment.latitude",
                "moment.longitude",
                "moment.locationName",
                "moment.locationAddress",
                "moment.privacy",
                "moment.syncStatus",
                "moment.confirmedByUserIds",
                "moment.confirmedAt",
                "moment.payloadDeletedAt",
                "moment.expiresAt",
                "moment.createdAt",
                "moment.updatedAt",
                "creator.id",
                "creator.email",
                "creator.fullName"
            ])
            .orderBy("moment.createdAt", "DESC")
            .getMany();
    }

    async updateMoment(userId: string, id: string, dto: UpdateMomentDto) {
        const couple = await this.coupleService.getMyCouple(userId);
        const moment = await this.momentRepository.findOne({ where: { id, coupleId: couple.id } });
        if (!moment) throw new NotFoundException("Moment not found");
        if (moment.creatorId !== userId) throw new ForbiddenException("Not your moment");

        if (dto.content !== undefined) {
            moment.content = dto.content;
        }
        if (dto.photos !== undefined) {
            moment.photos = dto.photos;
        }
        if (dto.lat !== undefined) {
            moment.latitude = dto.lat;
        }
        if (dto.lng !== undefined) {
            moment.longitude = dto.lng;
        }
        if (dto.locationName !== undefined) {
            moment.locationName = dto.locationName?.trim() || null;
        }
        if (dto.locationAddress !== undefined) {
            moment.locationAddress = dto.locationAddress?.trim() || null;
        }
        const normalizedIsPrivate = dto.isPrivate ?? dto.privacy;
        if (normalizedIsPrivate !== undefined) {
            moment.privacy = this.toEntityPrivacy(normalizedIsPrivate);
        }
        this.resetMomentSyncState(moment, userId);

        const saved = await this.momentRepository.save(moment);

        if (saved.privacy === MomentPrivacy.COUPLE) {
            await this.notifyPartnerForMoment(couple, userId, "updated", saved);
        }

        return (await this.findMomentForResponse(saved.id)) || saved;
    }

    async confirmMomentSynced(userId: string, id: string) {
        const couple = await this.coupleService.getMyCouple(userId);
        const moment = await this.momentRepository.findOne({ where: { id, coupleId: couple.id } });

        if (!moment) throw new NotFoundException("Moment not found");

        if (moment.syncStatus === SyncPayloadStatus.PAYLOAD_DELETED) {
            return this.buildSyncConfirmResponse(moment);
        }

        const confirmedByUserIds = mergeConfirmedUserIds(moment.confirmedByUserIds, userId);
        const requiredUserIds = getRequiredCoupleUserIds(couple);
        const nextStatus = resolveSyncStatus(confirmedByUserIds, requiredUserIds);

        moment.confirmedByUserIds = confirmedByUserIds;
        moment.syncStatus = nextStatus;
        if (nextStatus === SyncPayloadStatus.CONFIRMED) {
            this.clearMomentPayload(moment);
        }

        const saved = await this.momentRepository.save(moment);
        return this.buildSyncConfirmResponse(saved);
    }

    async deleteMoment(userId: string, id: string) {
        const couple = await this.coupleService.getMyCouple(userId);
        const moment = await this.momentRepository.findOne({ where: { id, coupleId: couple.id } });
        if (!moment) throw new NotFoundException("Moment not found");
        if (moment.creatorId !== userId) throw new ForbiddenException("Not your moment");

        const deletedSnapshot = {
            id: moment.id,
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
        moment: { id?: string; content?: string | null; photos?: string[] | null }
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
        const notificationType = this.resolveMomentNotificationType(action);
        const notificationData = {
            momentAction: action,
            ...(moment.id ? { momentId: moment.id } : {})
        };

        try {
            await this.notificationsService.createNotification(
                partnerId,
                title,
                content,
                notificationType,
                notificationData
            );
        } catch (error) {
            this.logger.warn(`Create moment notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }

    private resolveMomentNotificationType(action: "created" | "updated" | "deleted") {
        if (action === "updated") return NotificationType.MOMENT_UPDATED;
        if (action === "deleted") return NotificationType.MOMENT_DELETED;
        return NotificationType.MOMENT_CREATED;
    }

    private findMomentForResponse(momentId: string) {
        return this.momentRepository
            .createQueryBuilder("moment")
            .leftJoinAndSelect("moment.creator", "creator")
            .where("moment.id = :momentId", { momentId })
            .select([
                "moment.id",
                "moment.creatorId",
                "moment.content",
                "moment.photos",
                "moment.latitude",
                "moment.longitude",
                "moment.locationName",
                "moment.locationAddress",
                "moment.privacy",
                "moment.syncStatus",
                "moment.confirmedByUserIds",
                "moment.confirmedAt",
                "moment.payloadDeletedAt",
                "moment.expiresAt",
                "moment.createdAt",
                "moment.updatedAt",
                "creator.id",
                "creator.email",
                "creator.fullName"
            ])
            .getOne();
    }

    private resetMomentSyncState(moment: Moment, userId: string) {
        moment.syncStatus = SyncPayloadStatus.UPLOADED;
        moment.confirmedByUserIds = [userId];
        moment.confirmedAt = null;
        moment.payloadDeletedAt = null;
    }

    private clearMomentPayload(moment: Moment) {
        const now = new Date();
        moment.content = null;
        moment.photos = null;
        moment.latitude = null;
        moment.longitude = null;
        moment.locationName = null;
        moment.locationAddress = null;
        moment.syncStatus = SyncPayloadStatus.PAYLOAD_DELETED;
        moment.confirmedAt = now;
        moment.payloadDeletedAt = now;
    }

    private buildSyncConfirmResponse(moment: {
        id: string;
        syncStatus: SyncPayloadStatus | string;
        confirmedByUserIds?: string[] | null;
        confirmedAt?: Date | null;
        payloadDeletedAt?: Date | null;
    }) {
        return {
            success: true,
            id: moment.id,
            syncStatus: moment.syncStatus,
            confirmedByUserIds: moment.confirmedByUserIds ?? [],
            confirmedAt: moment.confirmedAt,
            payloadDeletedAt: moment.payloadDeletedAt
        };
    }

    private toEntityPrivacy(isPrivate?: boolean | string | null): MomentPrivacy {
        if (isPrivate === undefined || isPrivate === null) {
            return MomentPrivacy.COUPLE;
        }

        const normalized = this.normalizeBoolean(isPrivate);
        if (normalized === undefined) {
            // Fall back to private for unrecognized values to avoid accidental exposure.
            return MomentPrivacy.PRIVATE;
        }

        return normalized ? MomentPrivacy.PRIVATE : MomentPrivacy.COUPLE;
    }

    private normalizeBoolean(value: boolean | string): boolean | undefined {
        if (typeof value === "boolean") {
            return value;
        }

        const raw = value.trim().toLowerCase();
        if (["true", "1", "yes", "y", "on"].includes(raw)) {
            return true;
        }
        if (["false", "0", "no", "n", "off"].includes(raw)) {
            return false;
        }

        return undefined;
    }

    private async syncPhotosInBatches(userId: string, coupleId: string, photoUrls: string[]) {
        const batchSize = 5;
        for (let index = 0; index < photoUrls.length; index += batchSize) {
            const batch = photoUrls.slice(index, index + batchSize);
            await Promise.all(batch.map((url) => this.mediaService.addMedia(userId, coupleId, url)));
        }
    }
}
