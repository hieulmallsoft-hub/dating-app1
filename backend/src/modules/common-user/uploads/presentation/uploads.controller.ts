import { BadRequestException, Controller, Post, Body, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { UploadsService } from "../application/uploads.service";
import { PresignDto } from "./dto/presign.dto";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";

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
            storage: memoryStorage(),
            limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
            fileFilter: (_req, file, cb) => {
                const allowedMimeTypes = new Set([
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/gif",
                    "audio/mpeg",
                    "audio/wav",
                    "audio/ogg",
                    "audio/webm",
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
    async uploadFile(@UploadedFile() file: any) {
        if (!file) throw new BadRequestException("File is required");
        return this.uploadsService.uploadFile(file);
    }
}
