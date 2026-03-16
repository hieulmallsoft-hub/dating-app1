import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { CoupleService } from "../../couple/application/couple.service";
import type {
  Media,
  MediaStatus,
  MediaVisibility,
} from "../domain/entities/media.entity";
import { MediaRepository } from "../infrastructure/persistence/media.repository";
import { MediaRealtimeService } from "./media-realtime.service";
import { MediaGateway } from "../presentation/media.gateway";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";

type AlbumFilter = "all" | "me" | "partner";
type MediaType = "image" | "video";

type CreateMediaPayload = {
  url: string;
  type?: MediaType;
  caption?: string;
  visibility?: MediaVisibility;
  thumbUrl?: string;
};

type UpdateMediaPayload = {
  caption?: string;
  visibility?: MediaVisibility;
  thumbUrl?: string;
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly coupleService: CoupleService,
    private readonly mediaRealtimeService: MediaRealtimeService,
    private readonly mediaGateway: MediaGateway,
    private readonly notificationsService: NotificationsService
  ) {}

  async getAlbum(
    userId: string,
    filter: AlbumFilter = "all",
    limit = 20,
    cursor?: string
  ) {
    const couple = await this.coupleService.getMyCouple(userId);

    const partnerId =
      couple.user1Id === userId ? couple.user2Id : couple.user1Id;

    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

    const query = this.mediaRepository
      .createQueryBuilder("media")
      .where("media.coupleId = :coupleId", { coupleId: couple.id })
      .andWhere("media.deletedAt IS NULL");

    if (filter === "me") {
      query.andWhere("media.uploaderId = :userId", { userId });
    } else if (filter === "partner") {
      if (!partnerId) {
        throw new BadRequestException("Partner not connected");
      }
      query.andWhere("media.uploaderId = :partnerId", { partnerId });
    }

    if (cursor) {
      // Support 2 formats:
      // 1) ISO string: "2026-03-02T01:29:44.575Z"
      // 2) Compound:   "2026-03-02T01:29:44.575Z|<mediaId>" for stable pagination
      const [cursorCreatedAt, cursorId] = cursor.split("|");
      const cursorDate = new Date(cursorCreatedAt);
      if (Number.isNaN(cursorDate.getTime())) {
        throw new BadRequestException("Invalid cursor");
      }

      if (cursorId) {
        query.andWhere(
          "(media.createdAt < :cursorDate OR (media.createdAt = :cursorDate AND media.id < :cursorId))",
          { cursorDate, cursorId }
        );
      } else {
        query.andWhere("media.createdAt < :cursorDate", { cursorDate });
      }
    }

    const items = await query
      .orderBy("media.createdAt", "DESC")
      .addOrderBy("media.id", "DESC")
      .take(safeLimit)
      .getMany();

    const last = items.length > 0 ? items[items.length - 1] : null;
    const nextCursor =
      items.length === safeLimit && last
        ? `${last.createdAt.toISOString()}|${last.id}`
        : null;

    return { items, nextCursor };
  }

  // Internal helper used by other modules (e.g. Moments) when coupleId is already known.
  async addMedia(
    userId: string,
    coupleId: string,
    url: string,
    type: MediaType = "image"
  ) {
    const myCouple = await this.coupleService.getMyCouple(userId);
    if (myCouple.id !== coupleId) {
      throw new ForbiddenException("You are not in this couple");
    }

    if (type !== "image" && type !== "video") {
      throw new BadRequestException("Invalid media type");
    }

    const media = this.mediaRepository.create({
      uploaderId: userId,
      coupleId,
      url,
      type,
      status: "active",
    });

    const saved = await this.mediaRepository.save(media);
    this.notifyMediaChanged({
      coupleId,
      type: "created",
      mediaId: saved.id,
      actorId: userId,
    });
    await this.notifyPartnerForNewMedia(myCouple, userId, saved.type, saved.caption);
    return saved;
  }

  async createForMyCouple(userId: string, payload: CreateMediaPayload) {
    const couple = await this.coupleService.getMyCouple(userId);

    const type = payload.type ?? "image";
    if (type !== "image" && type !== "video") {
      throw new BadRequestException("Invalid media type");
    }

    const visibility = payload.visibility ?? "couple_only";
    const allowedVisibility: MediaVisibility[] = [
      "couple_only",
      "friends",
      "public",
    ];
    if (!allowedVisibility.includes(visibility)) {
      throw new BadRequestException("Invalid media visibility");
    }

    const media = this.mediaRepository.create({
      uploaderId: userId,
      coupleId: couple.id,
      url: payload.url,
      type,
      caption: payload.caption,
      visibility,
      thumbUrl: payload.thumbUrl,
      status: "active",
    });

    const saved = await this.mediaRepository.save(media);
    this.notifyMediaChanged({
      coupleId: couple.id,
      type: "created",
      mediaId: saved.id,
      actorId: userId,
    });
    await this.notifyPartnerForNewMedia(couple, userId, saved.type, saved.caption);
    return saved;
  }

  async getMediaById(userId: string, mediaId: string): Promise<Media> {
    const couple = await this.coupleService.getMyCouple(userId);

    const media = await this.mediaRepository
      .createQueryBuilder("media")
      .where("media.id = :mediaId", { mediaId })
      .andWhere("media.deletedAt IS NULL")
      .getOne();

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    if (media.coupleId !== couple.id) {
      throw new ForbiddenException("You are not in this couple");
    }

    return media;
  }

  async updateMedia(userId: string, mediaId: string, payload: UpdateMediaPayload) {
    const media = await this.getMediaById(userId, mediaId);

    if (payload.caption !== undefined) {
      media.caption = payload.caption;
    }

    if (payload.visibility !== undefined) {
      const allowedVisibility: MediaVisibility[] = [
        "couple_only",
        "friends",
        "public",
      ];
      if (!allowedVisibility.includes(payload.visibility)) {
        throw new BadRequestException("Invalid media visibility");
      }
      media.visibility = payload.visibility;
    }

    if (payload.thumbUrl !== undefined) {
      media.thumbUrl = payload.thumbUrl;
    }

    const saved = await this.mediaRepository.save(media);
    this.notifyMediaChanged({
      coupleId: saved.coupleId,
      type: "updated",
      mediaId: saved.id,
      actorId: userId,
    });
    return saved;
  }

  async deleteMedia(userId: string, mediaId: string) {
    const media = await this.getMediaById(userId, mediaId);
    await this.mediaRepository.softDelete({ id: media.id });
    this.notifyMediaChanged({
      coupleId: media.coupleId,
      type: "deleted",
      mediaId: media.id,
      actorId: userId,
    });
    return { success: true };
  }

  async updateMediaStatus(userId: string, mediaId: string, status: MediaStatus) {
    const media = await this.getMediaById(userId, mediaId);
    const allowedStatus: MediaStatus[] = ["processing", "active", "flagged", "synced"];

    if (!allowedStatus.includes(status)) {
      throw new BadRequestException("Invalid media status");
    }

    media.status = status;
    const saved = await this.mediaRepository.save(media);
    this.notifyMediaChanged({
      coupleId: saved.coupleId,
      type: "updated",
      mediaId: saved.id,
      actorId: userId,
    });
    return saved;
  }

  async waitForAlbumChange(userId: string, sinceVersion: number, timeoutMs: number) {
    const couple = await this.coupleService.getMyCouple(userId);

    const safeSince = Number.isFinite(sinceVersion) ? Math.max(0, Math.floor(sinceVersion)) : 0;
    const safeTimeout = Number.isFinite(timeoutMs)
      ? Math.min(30000, Math.max(1000, Math.floor(timeoutMs)))
      : 25000;

    return this.mediaRealtimeService.waitForChange(couple.id, safeSince, safeTimeout);
  }

  private notifyMediaChanged(change: {
    coupleId: string;
    type: "created" | "updated" | "deleted";
    mediaId: string;
    actorId: string;
  }) {
    const event = this.mediaRealtimeService.notify(change);
    this.mediaGateway.emitAlbumChanged(event);
  }

  private async notifyPartnerForNewMedia(
    couple: { user1Id: string; user2Id: string | null },
    uploaderId: string,
    mediaType: MediaType,
    caption?: string
  ) {
    const partnerId = couple.user1Id === uploaderId ? couple.user2Id : couple.user1Id;
    if (!partnerId) return;

    const title = mediaType === "video" ? "Video moi trong album" : "Anh moi trong album";
    const trimmedCaption = caption?.trim() || "";
    const content =
      trimmedCaption.length > 0
        ? trimmedCaption.length > 160
          ? `${trimmedCaption.slice(0, 157)}...`
          : trimmedCaption
        : mediaType === "video"
          ? "Doi cua ban vua dang mot video moi"
          : "Doi cua ban vua dang mot anh moi";

    try {
      await this.notificationsService.createNotification(partnerId, title, content, NotificationType.MEDIA);
    } catch (error) {
      this.logger.warn(`Create media notification failed: ${(error as Error)?.message || "unknown"}`);
    }
  }
}
