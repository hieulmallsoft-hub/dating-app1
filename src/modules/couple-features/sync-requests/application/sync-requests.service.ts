import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import { dirname, extname, resolve } from "path";
import { In, LessThan } from "typeorm";
import { CoupleService } from "../../couple/application/couple.service";
import {
    SyncRequest,
    SyncRequestStatus
} from "../domain/entities/sync-request.entity";
import { SyncRequestRepository } from "../infrastructure/persistence/sync-request.repository";
import { CreateSyncRequestDto } from "../presentation/dto/sync-request.dto";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";

type UploadedZipFile = {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
};

type DownloadPayload = {
    filePath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    syncRequest: SyncRequest;
};

@Injectable()
export class SyncRequestsService {
    private readonly logger = new Logger(SyncRequestsService.name);
    private readonly activeStatuses = [
        SyncRequestStatus.PENDING,
        SyncRequestStatus.UPLOADED,
        SyncRequestStatus.DOWNLOADED
    ];

    constructor(
        private readonly syncRequestRepository: SyncRequestRepository,
        private readonly coupleService: CoupleService,
        private readonly configService: ConfigService,
        private readonly notificationsService: NotificationsService
    ) {}

    async createRequest(userId: string, dto: CreateSyncRequestDto) {
        await this.expireStaleRequests();
        const couple = await this.coupleService.getMyCouple(userId);
        const providerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;
        if (!providerId) {
            throw new BadRequestException("Partner not connected");
        }

        const existing = await this.syncRequestRepository.findOne({
            where: {
                requesterId: userId,
                providerId,
                status: In(this.activeStatuses)
            },
            order: { createdAt: "DESC" }
        });

        if (existing && !this.isExpired(existing)) {
            return existing;
        }

        const syncRequest = this.syncRequestRepository.create({
            coupleId: couple.id,
            requesterId: userId,
            providerId,
            status: SyncRequestStatus.PENDING,
            note: this.normalizeNote(dto.note),
            expiresAt: this.buildExpiry(dto.expiresInHours)
        });

        const saved = await this.syncRequestRepository.save(syncRequest);
        await this.notifyUser(
            providerId,
            "Yeu cau dong bo du lieu",
            "Doi cua ban can khoi phuc du lieu. Hay upload file zip tu may nay."
        );
        return saved;
    }

    async listPendingForProvider(userId: string) {
        await this.expireStaleRequests();
        return this.syncRequestRepository.find({
            where: {
                providerId: userId,
                status: SyncRequestStatus.PENDING
            },
            order: { createdAt: "DESC" }
        });
    }

    async listMine(userId: string) {
        await this.expireStaleRequests();
        return this.syncRequestRepository.find({
            where: [
                { requesterId: userId },
                { providerId: userId }
            ],
            order: { createdAt: "DESC" },
            take: 50
        });
    }

    async getRequest(userId: string, id: string) {
        const syncRequest = await this.findRequestOrThrow(id);
        this.assertParticipant(syncRequest, userId);
        return this.expireIfNeeded(syncRequest);
    }

    async uploadZip(userId: string, id: string, file: UploadedZipFile) {
        const syncRequest = await this.findRequestOrThrow(id);
        this.assertProvider(syncRequest, userId);
        await this.expireIfNeeded(syncRequest);

        if (syncRequest.status === SyncRequestStatus.EXPIRED) {
            throw new BadRequestException("Sync request expired");
        }
        if (syncRequest.status === SyncRequestStatus.CONFIRMED) {
            throw new BadRequestException("Sync request already confirmed");
        }
        if (syncRequest.status === SyncRequestStatus.CANCELLED) {
            throw new BadRequestException("Sync request cancelled");
        }

        this.validateZipFile(file);

        if (syncRequest.storageKey) {
            await this.deleteStoredFile(syncRequest.storageKey);
        }

        const storageKey = this.buildStorageKey(syncRequest.id, file.originalname);
        const filePath = this.resolveStoragePath(storageKey);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, file.buffer);

        syncRequest.status = SyncRequestStatus.UPLOADED;
        syncRequest.storageKey = storageKey;
        syncRequest.originalFileName = this.sanitizeFileName(file.originalname);
        syncRequest.mimeType = file.mimetype || "application/zip";
        syncRequest.fileSize = file.size;
        syncRequest.uploadedAt = new Date();
        syncRequest.downloadedAt = null;
        syncRequest.confirmedAt = null;
        syncRequest.payloadDeletedAt = null;
        syncRequest.expiresAt = this.buildExpiry();

        const saved = await this.syncRequestRepository.save(syncRequest);
        await this.notifyUser(
            syncRequest.requesterId,
            "File dong bo da san sang",
            "Doi cua ban da upload file zip. Hay tai ve va import du lieu."
        );
        return saved;
    }

    async prepareDownload(userId: string, id: string): Promise<DownloadPayload> {
        const syncRequest = await this.findRequestOrThrow(id);
        this.assertRequester(syncRequest, userId);
        await this.expireIfNeeded(syncRequest);

        if (syncRequest.status === SyncRequestStatus.EXPIRED) {
            throw new BadRequestException("Sync request expired");
        }
        if (!syncRequest.storageKey) {
            throw new BadRequestException("Sync zip has not been uploaded");
        }
        if (
            syncRequest.status !== SyncRequestStatus.UPLOADED &&
            syncRequest.status !== SyncRequestStatus.DOWNLOADED
        ) {
            throw new BadRequestException("Sync zip is not available");
        }

        const filePath = this.resolveStoragePath(syncRequest.storageKey);
        const fileStat = await stat(filePath).catch(() => null);
        if (!fileStat || !fileStat.isFile()) {
            throw new NotFoundException("Sync zip payload not found");
        }

        syncRequest.status = SyncRequestStatus.DOWNLOADED;
        syncRequest.downloadedAt = new Date();
        syncRequest.fileSize = Number(fileStat.size);
        const saved = await this.syncRequestRepository.save(syncRequest);

        return {
            filePath,
            fileName: this.buildDownloadName(saved),
            mimeType: saved.mimeType || "application/zip",
            fileSize: Number(fileStat.size),
            syncRequest: saved
        };
    }

    async confirmImported(userId: string, id: string) {
        const syncRequest = await this.findRequestOrThrow(id);
        this.assertRequester(syncRequest, userId);

        if (syncRequest.status === SyncRequestStatus.CONFIRMED) {
            return syncRequest;
        }
        if (syncRequest.status === SyncRequestStatus.CANCELLED) {
            throw new BadRequestException("Sync request cancelled");
        }

        if (syncRequest.storageKey) {
            await this.deleteStoredFile(syncRequest.storageKey);
        }

        const now = new Date();
        syncRequest.status = SyncRequestStatus.CONFIRMED;
        syncRequest.confirmedAt = now;
        syncRequest.payloadDeletedAt = now;
        syncRequest.storageKey = null;
        return this.syncRequestRepository.save(syncRequest);
    }

    async cancelRequest(userId: string, id: string) {
        const syncRequest = await this.findRequestOrThrow(id);
        this.assertRequester(syncRequest, userId);

        if (syncRequest.storageKey) {
            await this.deleteStoredFile(syncRequest.storageKey);
        }

        syncRequest.status = SyncRequestStatus.CANCELLED;
        syncRequest.cancelledAt = new Date();
        syncRequest.payloadDeletedAt = syncRequest.payloadDeletedAt ?? new Date();
        syncRequest.storageKey = null;
        return this.syncRequestRepository.save(syncRequest);
    }

    private async findRequestOrThrow(id: string) {
        const syncRequest = await this.syncRequestRepository.findOne({ where: { id } });
        if (!syncRequest) {
            throw new NotFoundException("Sync request not found");
        }
        return syncRequest;
    }

    private assertParticipant(syncRequest: SyncRequest, userId: string) {
        if (syncRequest.requesterId !== userId && syncRequest.providerId !== userId) {
            throw new ForbiddenException("Sync request does not belong to current user");
        }
    }

    private assertRequester(syncRequest: SyncRequest, userId: string) {
        if (syncRequest.requesterId !== userId) {
            throw new ForbiddenException("Only requester can perform this action");
        }
    }

    private assertProvider(syncRequest: SyncRequest, userId: string) {
        if (syncRequest.providerId !== userId) {
            throw new ForbiddenException("Only provider can upload this sync zip");
        }
    }

    private async expireIfNeeded(syncRequest: SyncRequest) {
        if (!this.isExpired(syncRequest)) {
            return syncRequest;
        }

        if (syncRequest.storageKey) {
            await this.deleteStoredFile(syncRequest.storageKey);
        }

        syncRequest.status = SyncRequestStatus.EXPIRED;
        syncRequest.payloadDeletedAt = syncRequest.payloadDeletedAt ?? new Date();
        syncRequest.storageKey = null;
        return this.syncRequestRepository.save(syncRequest);
    }

    private async expireStaleRequests() {
        const stale = await this.syncRequestRepository.find({
            where: {
                status: In(this.activeStatuses),
                expiresAt: LessThan(new Date())
            },
            take: 50
        });

        await Promise.all(stale.map((item) => this.expireIfNeeded(item)));
    }

    private isExpired(syncRequest: SyncRequest) {
        if (!this.activeStatuses.includes(syncRequest.status)) return false;
        if (!syncRequest.expiresAt) return false;
        return syncRequest.expiresAt.getTime() <= Date.now();
    }

    private validateZipFile(file: UploadedZipFile) {
        if (!file) {
            throw new BadRequestException("Zip file is required");
        }
        if (!file.buffer || file.size <= 0) {
            throw new BadRequestException("Zip file is empty");
        }

        const maxSizeBytes = this.getMaxZipSizeBytes();
        if (file.size > maxSizeBytes) {
            throw new BadRequestException(`Zip file must be <= ${Math.floor(maxSizeBytes / 1024 / 1024)}MB`);
        }

        const cleanName = file.originalname || "";
        const hasZipExtension = extname(cleanName).toLowerCase() === ".zip";
        const allowedMimeTypes = new Set([
            "application/zip",
            "application/x-zip",
            "application/x-zip-compressed",
            "multipart/x-zip",
            "application/octet-stream"
        ]);

        if (!hasZipExtension && !allowedMimeTypes.has(file.mimetype)) {
            throw new BadRequestException("Only .zip sync files are supported");
        }
    }

    private buildStorageKey(requestId: string, originalName: string) {
        const random = randomBytes(16).toString("hex");
        const safeExt = extname(originalName || "").toLowerCase() === ".zip" ? ".zip" : ".zip";
        return `${requestId}/${Date.now()}-${random}${safeExt}`;
    }

    private buildDownloadName(syncRequest: SyncRequest) {
        const original = syncRequest.originalFileName || "dating-sync.zip";
        const clean = this.sanitizeFileName(original);
        return clean.toLowerCase().endsWith(".zip") ? clean : `${clean}.zip`;
    }

    private sanitizeFileName(value: string) {
        const clean = (value || "dating-sync.zip").replace(/[\\/:*?"<>|]+/g, "-").trim();
        return clean || "dating-sync.zip";
    }

    private resolveStoragePath(storageKey: string) {
        const root = this.getSyncZipRoot();
        const filePath = resolve(root, ...storageKey.split("/"));
        if (!filePath.startsWith(root)) {
            throw new BadRequestException("Invalid sync storage key");
        }
        return filePath;
    }

    private getSyncZipRoot() {
        const syncZipPath = this.configService.get<string>("SYNC_ZIP_PATH") || "./sync-zips";
        return resolve(process.cwd(), syncZipPath);
    }

    private getMaxZipSizeBytes() {
        const configured = Number(this.configService.get<string>("SYNC_ZIP_MAX_SIZE_MB"));
        const maxMb = Number.isFinite(configured) && configured > 0 ? configured : 300;
        return Math.floor(maxMb * 1024 * 1024);
    }

    private buildExpiry(expiresInHours?: number) {
        const configuredHours = Number(this.configService.get<string>("SYNC_REQUEST_TTL_HOURS"));
        const fallbackHours = Number.isFinite(configuredHours) && configuredHours > 0 ? configuredHours : 72;
        const rawHours = expiresInHours ?? fallbackHours;
        const safeHours = Math.max(1, Math.min(168, Math.floor(rawHours)));
        return new Date(Date.now() + safeHours * 60 * 60 * 1000);
    }

    private normalizeNote(value?: string | null) {
        const clean = (value || "").trim();
        return clean ? clean.slice(0, 500) : null;
    }

    private async deleteStoredFile(storageKey: string) {
        const filePath = this.resolveStoragePath(storageKey);
        try {
            await unlink(filePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
                this.logger.warn(`Delete sync zip failed: ${(error as Error)?.message || "unknown"}`);
            }
        }
    }

    private async notifyUser(userId: string, title: string, content: string) {
        try {
            await this.notificationsService.createNotification(userId, title, content, NotificationType.GENERAL);
        } catch (error) {
            this.logger.warn(`Create sync notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }
}
