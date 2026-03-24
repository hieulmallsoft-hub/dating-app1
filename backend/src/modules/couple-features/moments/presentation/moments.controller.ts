import {
    BadRequestException,
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Req,
    UseGuards,
    Param,
    UnauthorizedException,
    UploadedFiles,
    UseInterceptors
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse,
    ApiBody,
    ApiConsumes
} from "@nestjs/swagger";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { MomentsService } from "../application/moments.service";
import {
    CreateMomentDto,
    MomentActionResponseDto,
    MomentResponseDto,
    UpdateMomentDto
} from "./dto/moment-ops.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { toMomentResponse, toMomentResponseList } from "./mappers/moment-response.mapper";
import { UploadsService } from "../../../common-user/uploads/application/uploads.service";

@ApiTags("moments")
@ApiBearerAuth("JWT-auth")
@Controller("moments")
@UseGuards(JwtAuthGuard)
export class MomentsController {
    constructor(
        private readonly momentsService: MomentsService,
        private readonly uploadsService: UploadsService
    ) {}

    @Get()
    @ApiOperation({
        summary: "Get moment feed",
        description: "Returns moment feed for current couple."
    })
    @ApiOkResponse({
        description: "Returns moment feed",
        type: MomentResponseDto,
        isArray: true
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getMomentFeed(@Req() req) {
        const userId = this.getCurrentUserId(req);
        const moments = await this.momentsService.getFeed(userId);
        return toMomentResponseList(moments, userId);
    }

    @Post()
    @ApiOperation({
        summary: "Create moment",
        description:
            "Create moment. Supports both application/json (photos is URL list) and multipart/form-data (photos is image files). If photos exist, media album is synced automatically."
    })
    @ApiConsumes("application/json", "multipart/form-data")
    @ApiBody({
        schema: {
            oneOf: [
                {
                    type: "object",
                    properties: {
                        content: { type: "string", example: "Today was a beautiful day together." },
                        photos: {
                            type: "array",
                            items: { type: "string" },
                            example: ["https://cdn.example.com/photos/1.jpg", "https://cdn.example.com/photos/2.jpg"]
                        },
                        isPrivate: { type: "boolean", example: true }
                    }
                },
                {
                    type: "object",
                    properties: {
                        content: { type: "string" },
                        isPrivate: { type: "boolean" },
                        photos: {
                            type: "array",
                            items: { type: "string", format: "binary" },
                            description: "Attach one or more image files"
                        }
                    }
                }
            ]
        }
    })
    @ApiCreatedResponse({
        description: "Moment created",
        type: MomentResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload (isPrivate or payload format)"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    @UseInterceptors(
        FilesInterceptor("photos", 10, {
            storage: memoryStorage(),
            limits: { fileSize: 50 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                const allowedImageMimeTypes = new Set([
                    "image/jpeg",
                    "image/jpg",
                    "image/png",
                    "image/webp",
                    "image/gif",
                    "image/heic",
                    "image/heif",
                    "image/heic-sequence",
                    "image/heif-sequence"
                ]);
                if (!allowedImageMimeTypes.has(file.mimetype)) {
                    return cb(new BadRequestException("Unsupported image type") as any, false);
                }
                return cb(null, true);
            }
        })
    )
    async createMoment(@Req() req, @Body() dto: CreateMomentDto, @UploadedFiles() photoFiles: any[] = []) {
        const userId = this.getCurrentUserId(req);
        const uploadedPhotoUrls: string[] = [];

        for (const file of photoFiles) {
            const uploaded = await this.uploadsService.uploadFile(file, {
                requestBaseUrl: this.uploadsService.resolveRequestBaseUrl(req)
            });
            if (uploaded.type !== "image") {
                throw new BadRequestException("Moment only supports image files");
            }
            uploadedPhotoUrls.push(uploaded.fileUrl);
        }

        const mergedPhotos = Array.from(new Set([...(dto.photos || []), ...uploadedPhotoUrls]));
        const payload: CreateMomentDto = {
            ...dto,
            photos: mergedPhotos.length > 0 ? mergedPhotos : dto.photos
        };

        const moment = await this.momentsService.createMoment(userId, payload);
        return toMomentResponse(moment, userId);
    }

    @Patch(":id")
    @ApiOperation({
        summary: "Update moment",
        description: "Update moment by id."
    })
    @ApiParam({
        name: "id",
        description: "Moment ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Moment updated",
        type: MomentResponseDto
    })
    @ApiNotFoundResponse({
        description: "Moment not found"
    })
    @ApiForbiddenResponse({
        description: "Current user is not the owner of this moment"
    })
    @ApiBadRequestResponse({
        description: "Invalid payload"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateMoment(@Req() req, @Param("id") id: string, @Body() dto: UpdateMomentDto) {
        const userId = this.getCurrentUserId(req);
        const moment = await this.momentsService.updateMoment(userId, id, dto);
        return toMomentResponse(moment, userId);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Delete moment",
        description: "Delete moment by id."
    })
    @ApiParam({
        name: "id",
        description: "Moment ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Moment deleted",
        type: MomentActionResponseDto
    })
    @ApiNotFoundResponse({
        description: "Moment not found"
    })
    @ApiForbiddenResponse({
        description: "Current user is not the owner of this moment"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async deleteMoment(@Req() req, @Param("id") id: string) {
        return this.momentsService.deleteMoment(this.getCurrentUserId(req), id);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}




