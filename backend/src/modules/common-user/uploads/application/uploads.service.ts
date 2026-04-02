import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { extname, join, resolve } from "path";

type RequestLike = {
    protocol?: string;
    headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class UploadsService {
    private s3Client: S3Client | null = null;
    private s3ConfigKey: string | null = null;

    constructor(private readonly configService: ConfigService) {}

    async generatePresignedUrl(_fileName: string, _type: string) {
        const s3 = this.getS3Context();
        if (!s3) {
            throw new BadRequestException(
                "S3 upload is not configured. Set AWS_S3_BUCKET, AWS_REGION, and credentials."
            );
        }

        const fileName = typeof _fileName === "string" ? _fileName : "upload.bin";
        const type = typeof _type === "string" ? _type : "";
        const kind = type.includes("/") ? this.resolveKindByMimeType(type) : this.normalizeType(type);
        const objectKey = this.buildObjectKey(kind, fileName);

        try {
            const command = new PutObjectCommand({
                Bucket: s3.bucket,
                Key: objectKey,
                ContentType: type.includes("/") ? type : undefined
            });
            const uploadUrl = await getSignedUrl(s3.client, command, { expiresIn: 900 }); // 15 minutes
            return {
                uploadUrl,
                fileUrl: this.buildFileUrl(objectKey),
                fileName: objectKey
            };
        } catch (error: unknown) {
            throw new InternalServerErrorException(
                `Presigned upload generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
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

        const s3 = this.getS3Context();
        if (s3) {
            try {
                await s3.client.send(
                    new PutObjectCommand({
                        Bucket: s3.bucket,
                        Key: objectKey,
                        Body: file.buffer,
                        ContentType: file.mimetype
                    })
                );
            } catch (error: unknown) {
                throw new InternalServerErrorException(
                    `Upload to S3 failed: ${error instanceof Error ? error.message : "Unknown error"}`
                );
            }
        } else {
            try {
                await mkdir(this.resolveTypeDir(kind), { recursive: true });
                await writeFile(fullPath, file.buffer);
            } catch (error: unknown) {
                throw new InternalServerErrorException(
                    `Upload to local storage failed: ${error instanceof Error ? error.message : "Unknown error"}`
                );
            }
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

        const s3PublicBaseUrl = this.getS3PublicBaseUrl();
        if (s3PublicBaseUrl) {
            return `${s3PublicBaseUrl}/${objectKey}`;
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

    private getS3Context() {
        const bucket =
            this.configService.get<string>("AWS_S3_BUCKET") ||
            this.configService.get<string>("UPLOAD_BUCKET");

        let region =
            this.configService.get<string>("AWS_REGION") ||
            this.configService.get<string>("UPLOAD_S3_REGION");

        if (!region || region === "auto") {
            region = this.resolveRegionFromEndpoint(
                this.configService.get<string>("UPLOAD_S3_ENDPOINT")
            );
        }

        if (!bucket || !region) return null;

        const accessKeyId =
            this.configService.get<string>("AWS_ACCESS_KEY_ID") ||
            this.configService.get<string>("UPLOAD_S3_ACCESS_KEY_ID");
        const secretAccessKey =
            this.configService.get<string>("AWS_SECRET_ACCESS_KEY") ||
            this.configService.get<string>("UPLOAD_S3_SECRET_ACCESS_KEY");
        const credentials =
            accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

        const endpoint = this.configService.get<string>("UPLOAD_S3_ENDPOINT");
        const forcePathStyle =
            (this.configService.get<string>("UPLOAD_S3_FORCE_PATH_STYLE") || "").toLowerCase() ===
            "true";

        const configKey = `${region}:${accessKeyId || ""}:${endpoint || ""}:${forcePathStyle ? "1" : "0"}`;
        if (!this.s3Client || this.s3ConfigKey !== configKey) {
            const s3Options: {
                region: string;
                credentials?: { accessKeyId: string; secretAccessKey: string };
                endpoint?: string;
                forcePathStyle?: boolean;
            } = { region, credentials };
            if (endpoint) s3Options.endpoint = endpoint;
            if (forcePathStyle) s3Options.forcePathStyle = true;
            this.s3Client = new S3Client(s3Options);
            this.s3ConfigKey = configKey;
        }

        return {
            client: this.s3Client,
            bucket,
            region
        };
    }

    private getS3PublicBaseUrl() {
        const bucket =
            this.configService.get<string>("AWS_S3_BUCKET") ||
            this.configService.get<string>("UPLOAD_BUCKET");
        const region =
            this.configService.get<string>("AWS_REGION") ||
            this.configService.get<string>("UPLOAD_S3_REGION");
        if (!bucket || !region) return null;

        const endpoint = this.configService.get<string>("UPLOAD_S3_ENDPOINT");
        const forcePathStyle =
            (this.configService.get<string>("UPLOAD_S3_FORCE_PATH_STYLE") || "").toLowerCase() ===
            "true";
        if (endpoint) {
            try {
                const url = new URL(endpoint);
                if (forcePathStyle) {
                    return `${url.origin.replace(/\/+$/, "")}/${bucket}`;
                }
                return `${url.protocol}//${bucket}.${url.host}`;
            } catch {
                // fall through to standard AWS URL
            }
        }

        const resolvedRegion =
            region === "auto" ? this.resolveRegionFromEndpoint(endpoint) || "us-east-1" : region;
        const host =
            resolvedRegion === "us-east-1"
                ? "s3.amazonaws.com"
                : `s3.${resolvedRegion}.amazonaws.com`;
        return `https://${bucket}.${host}`;
    }

    private resolveRegionFromEndpoint(endpoint?: string | null) {
        if (!endpoint) return null;
        try {
            const url = new URL(endpoint);
            const host = url.host;
            if (host === "s3.amazonaws.com") return "us-east-1";
            const match = host.match(/^s3[.-]([a-z0-9-]+)\./i);
            if (match && match[1]) return match[1];
        } catch {
            return null;
        }
        return null;
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
