import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { extname, join, resolve } from "path";

type RequestLike = {
    protocol?: string;
    headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class UploadsService {
    constructor(private readonly configService: ConfigService) {}

    async generatePresignedUrl(_fileName: string, _type: string) {
        throw new BadRequestException(
            "Presigned upload is disabled in local storage mode. Use POST /uploads/file with multipart/form-data."
        );
    }

    async uploadFile(file: {
        originalname: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
    }, options?: { requestBaseUrl?: string | null }) {
        const kind = this.resolveKindByMimeType(file.mimetype);
        const objectKey = this.buildObjectKey(kind, file.originalname);
        const fullPath = this.resolveObjectPath(objectKey);

        try {
            await mkdir(this.resolveTypeDir(kind), { recursive: true });
            await writeFile(fullPath, file.buffer);
        } catch (error: unknown) {
            throw new InternalServerErrorException(
                `Upload to local storage failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }

        return {
            fileUrl: this.buildFileUrl(objectKey, options?.requestBaseUrl),
            type: kind,
            mimeType: file.mimetype,
            size: file.size,
            originalName: file.originalname,
            fileName: objectKey
        };
    }

    resolveRequestBaseUrl(req?: RequestLike | null) {
        if (!req) return null;
        const headers = req.headers ?? {};
        const forwardedProto = this.getFirstHeaderValue(headers["x-forwarded-proto"]);
        const forwardedHost = this.getFirstHeaderValue(headers["x-forwarded-host"]);
        const host = this.getFirstHeaderValue(headers.host);

        const protocol = (forwardedProto || req.protocol || "http").split(",")[0].trim();
        const resolvedHost = (forwardedHost || host || "").split(",")[0].trim();

        if (!resolvedHost) return null;
        return `${protocol}://${resolvedHost}`;
    }

    private resolveKindByMimeType(mimeType: string) {
        if (typeof mimeType !== "string") {
            throw new BadRequestException("Invalid mime type");
        }
        if (mimeType.startsWith("video/")) {
            return "video";
        }
        if (mimeType.startsWith("audio/")) {
            return "voice";
        }
        return "image";
    }

    private buildObjectKey(type: string, originalName: string) {
        const normalizedType = this.normalizeType(type);
        const safeExt = extname(originalName || "").toLowerCase().slice(0, 12);
        const random = randomBytes(16).toString("hex");
        return `${normalizedType}/${Date.now()}-${random}${safeExt}`;
    }

    private normalizeType(type: string) {
        if (type === "video" || type === "voice" || type === "image") {
            return type;
        }
        return "image";
    }

    private buildFileUrl(objectKey: string, requestBaseUrl?: string | null) {
        const publicBaseUrl = this.configService.get<string>("UPLOAD_PUBLIC_BASE_URL");
        if (publicBaseUrl) {
            return `${publicBaseUrl.replace(/\/+$/, "")}/${objectKey}`;
        }

        const baseUrl = this.resolveBaseUrl(requestBaseUrl);
        return `${baseUrl}/uploads/${objectKey}`;
    }

    private resolveObjectPath(objectKey: string) {
        return join(this.getUploadRoot(), ...objectKey.split("/"));
    }

    private resolveTypeDir(type: string) {
        return join(this.getUploadRoot(), type);
    }

    private getUploadRoot() {
        const uploadPath = this.configService.get<string>("UPLOAD_PATH") || "./uploads";
        return resolve(process.cwd(), uploadPath);
    }

    private resolveBaseUrl(requestBaseUrl?: string | null) {
        if (requestBaseUrl) {
            return requestBaseUrl.replace(/\/+$/, "");
        }

        const explicitBaseUrl =
            this.configService.get<string>("AUTH_BASE_URL") || this.configService.get<string>("APP_URL");
        if (explicitBaseUrl) {
            return explicitBaseUrl.replace(/\/+$/, "");
        }

        const port = this.configService.get<string>("PORT") || this.configService.get<string>("APP_PORT") || "3000";
        return `http://localhost:${port}`;
    }

    private getFirstHeaderValue(value: string | string[] | undefined) {
        if (Array.isArray(value)) {
            return value[0];
        }
        return value;
    }
}
