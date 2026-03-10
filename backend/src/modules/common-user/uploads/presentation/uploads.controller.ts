import { BadRequestException, Controller, Post, Body, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from "@nestjs/common";
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
        summary: "T?o URL presigned d? upload (legacy)",
        description: "Endpoint tuong thích ngu?c cho co ch? presign upload trên cloud."
    })
    @ApiOkResponse({
        description: "Tr? v? payload presigned",
        type: PresignedUploadResponseDto
    })
    @ApiBadRequestResponse({
        description: "fileName/type không h?p l? ho?c tính nang b? t?t"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async presign(@Body() presignDto: PresignDto) {
        return this.uploadsService.generatePresignedUrl(presignDto.fileName, presignDto.type);
    }

    @Post("file")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "T?i file tr?c ti?p",
        description:
            "T?i lên m?t file b?ng multipart/form-data. MIME du?c phép g?m image/audio/video, dung lu?ng t?i da 50MB."
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
        description: "T?i file thành công, tr? v? URL và metadata",
        type: UploadFileResponseDto
    })
    @ApiBadRequestResponse({
        description: "Thi?u file, d?nh d?ng không h? tr? ho?c file quá l?n"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
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

