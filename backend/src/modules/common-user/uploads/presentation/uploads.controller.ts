import { BadRequestException, Controller, Post, Body, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile, Req } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { UploadsService } from "../application/uploads.service";
import { PresignDto } from "./dto/presign.dto";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";
import { PresignedUploadResponseDto, UploadFileResponseDto } from "./dto/upload-ops.dto";

@ApiTags("uploads")
@ApiBearerAuth("JWT-auth")
@Controller("uploads")
@UseGuards(JwtAuthGuard)
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) {}

    @Post("presign")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Create presigned upload URL (legacy)",
        description: "Backward-compatible endpoint for cloud presigned upload flow."
    })
    @ApiOkResponse({
        description: "Returns presigned payload",
        type: PresignedUploadResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid fileName/type or feature is disabled"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createUploadPresign(@Body() presignDto: PresignDto) {
        return this.uploadsService.generatePresignedUrl(presignDto.fileName, presignDto.type);
    }

    @Post("file")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Upload file directly",
        description: "Upload one file via multipart/form-data. Allowed MIME: image/audio/video, max size 50MB."
    })
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
    @ApiOkResponse({
        description: "File uploaded successfully, returns URL and metadata",
        type: UploadFileResponseDto
    })
    @ApiBadRequestResponse({
        description: "Missing file, unsupported format, or file too large"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    @UseInterceptors(
        FileInterceptor("file", {
            storage: memoryStorage(),
            limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
            fileFilter: (_req, file, cb) => {
                const allowedMimeTypes = new Set([
                    "image/jpeg",
                    "image/jpg",
                    "image/png",
                    "image/webp",
                    "image/gif",
                    "image/heic",
                    "image/heif",
                    "image/heic-sequence",
                    "image/heif-sequence",
                    "audio/mpeg",
                    "audio/aac",
                    "audio/x-aac",
                    "audio/amr",
                    "audio/amr-wb",
                    "audio/opus",
                    "audio/mp4",
                    "audio/m4a",
                    "audio/x-m4a",
                    "audio/3gpp",
                    "audio/3gpp2",
                    "audio/caf",
                    "audio/x-caf",
                    "audio/wav",
                    "audio/ogg",
                    "audio/webm",
                    "video/3gpp",
                    "video/3gpp2",
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
    async uploadFile(@Req() req, @UploadedFile() file: any) {
        if (!file) throw new BadRequestException("File is required");
        return this.uploadsService.uploadFile(file, {
            requestBaseUrl: this.uploadsService.resolveRequestBaseUrl(req)
        });
    }
}

