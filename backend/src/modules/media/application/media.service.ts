import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CoupleService } from "../../couple/application/couple.service";
import type { MediaVisibility } from "../domain/entities/media.entity";
import { MediaRepository } from "../infrastructure/persistence/media.repository";

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
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly coupleService: CoupleService
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

  // Legacy: keep for compatibility with /media/album (client sends coupleId)
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
    });

    return this.mediaRepository.save(media);
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
    });

    return this.mediaRepository.save(media);
  }

  async getMediaById(userId: string, mediaId: string) {
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

    return this.mediaRepository.save(media);
  }

  async deleteMedia(userId: string, mediaId: string) {
    const media = await this.getMediaById(userId, mediaId);
    await this.mediaRepository.softDelete({ id: media.id });
    return { success: true };
  }
}

