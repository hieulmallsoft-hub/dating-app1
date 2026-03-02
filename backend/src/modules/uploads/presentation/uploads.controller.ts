import { BadRequestException, Controller, Post, Body, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import * as crypto from "crypto";
import * as fs from "fs";
import { UploadsService } from "../application/uploads.service";
import { PresignDto } from "./dto/presign.dto";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";

function resolvePublicDir() {
    const cwd = process.cwd();

    // Common case: backend started from ./backend
    const direct = join(cwd, "public");
    if (fs.existsSync(direct)) return direct;

    // Monorepo case: backend started from repo root
    const nestedBackend = join(cwd, "backend", "public");
    if (fs.existsSync(nestedBackend)) return nestedBackend;

    return direct;
}

@ApiBearerAuth("JWT-auth")
@Controller("uploads")
@UseGuards(JwtAuthGuard)
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) {}

    @Post("presign")
    @HttpCode(HttpStatus.OK)
    async presign(@Body() presignDto: PresignDto) {
        return this.uploadsService.generatePresignedUrl(presignDto.fileName, presignDto.type);
    }

    @Post("file")
    @HttpCode(HttpStatus.OK)
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                file: { type: "string", format: "binary" }
            },
            required: ["file"]
        }
    })
    @UseInterceptors(
        FileInterceptor("file", {
            storage: diskStorage({
                destination: (_req, file, cb) => {
                    const isVideo = typeof file.mimetype === "string" && file.mimetype.startsWith("video/");
                    const kind = isVideo ? "video" : "image";
                    const dest = join(resolvePublicDir(), "uploads", kind);
                    fs.mkdirSync(dest, { recursive: true });
                    cb(null, dest);
                },
                filename: (_req, file, cb) => {
                    const safeExt = extname(file.originalname || "").toLowerCase().slice(0, 12);
                    const random = crypto.randomBytes(16).toString("hex");
                    cb(null, `${Date.now()}-${random}${safeExt}`);
                }
            }),
            limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
            fileFilter: (_req, file, cb) => {
                const allowedMimeTypes = new Set([
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/gif",
                    "video/mp4",
                    "video/webm",
                    "video/quicktime"
                ]);

                if (!allowedMimeTypes.has(file.mimetype)) {
                    return cb(new BadRequestException("Unsupported file type") as any, false);
                }

                return cb(null, true);
            }
        })
    )
    uploadFile(@UploadedFile() file: any, @Req() req: any) {
        if (!file) throw new BadRequestException("File is required");

        const isVideo = typeof file.mimetype === "string" && file.mimetype.startsWith("video/");
        const kind = isVideo ? "video" : "image";
        const protocol = req?.protocol || "http";
        const host = req?.get ? req.get("host") : req?.headers?.host;

        return {
            fileUrl: `${protocol}://${host}/uploads/${kind}/${file.filename}`,
            type: kind,
            mimeType: file.mimetype,
            size: file.size,
            originalName: file.originalname,
            fileName: file.filename
        };
    }
}
