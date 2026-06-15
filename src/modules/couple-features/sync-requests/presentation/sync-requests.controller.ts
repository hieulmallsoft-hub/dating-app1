import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Post,
    Req,
    Res,
    StreamableFile,
    UnauthorizedException,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { createReadStream } from "fs";
import { extname } from "path";
import type { Response } from "express";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { SyncRequestsService } from "../application/sync-requests.service";
import {
    CreateSyncRequestDto,
    SyncRequestActionResponseDto,
    SyncRequestListResponseDto,
    SyncRequestResponseDto
} from "./dto/sync-request.dto";
import {
    toSyncRequestResponse,
    toSyncRequestResponseList
} from "./mappers/sync-request-response.mapper";

@ApiTags("sync-requests")
@ApiBearerAuth("JWT-auth")
@Controller("sync-requests")
@UseGuards(JwtAuthGuard)
export class SyncRequestsController {
    constructor(private readonly syncRequestsService: SyncRequestsService) {}

    @Post()
    @ApiOperation({
        summary: "Create partner sync request",
        description:
            "Current device needs restore. Server asks partner device to upload local data as a zip file."
    })
    @ApiCreatedResponse({
        description: "Sync request created or existing active request returned",
        type: SyncRequestResponseDto
    })
    @ApiBadRequestResponse({
        description: "Current user has no connected partner"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createRequest(@Req() req, @Body() dto: CreateSyncRequestDto) {
        const syncRequest = await this.syncRequestsService.createRequest(this.getCurrentUserId(req), dto);
        return toSyncRequestResponse(syncRequest);
    }

    @Get("pending")
    @ApiOperation({
        summary: "List pending sync requests for this device",
        description: "Partner device calls this endpoint to know whether it should export and upload a zip."
    })
    @ApiOkResponse({
        description: "Pending requests where current user is the provider",
        type: SyncRequestListResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async listPending(@Req() req) {
        const items = await this.syncRequestsService.listPendingForProvider(this.getCurrentUserId(req));
        return { items: toSyncRequestResponseList(items) };
    }

    @Get("mine")
    @ApiOperation({
        summary: "List my sync requests",
        description: "Returns recent sync requests where current user is requester or provider."
    })
    @ApiOkResponse({
        description: "Recent sync requests",
        type: SyncRequestListResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async listMine(@Req() req) {
        const items = await this.syncRequestsService.listMine(this.getCurrentUserId(req));
        return { items: toSyncRequestResponseList(items) };
    }

    @Get(":id")
    @ApiOperation({
        summary: "Get sync request detail",
        description: "Requester and provider can inspect request status."
    })
    @ApiParam({
        name: "id",
        description: "Sync request id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Sync request detail",
        type: SyncRequestResponseDto
    })
    @ApiForbiddenResponse({
        description: "Current user is not part of the sync request"
    })
    @ApiNotFoundResponse({
        description: "Sync request not found"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getRequest(@Req() req, @Param("id") id: string) {
        const syncRequest = await this.syncRequestsService.getRequest(this.getCurrentUserId(req), id);
        return toSyncRequestResponse(syncRequest);
    }

    @Post(":id/upload")
    @ApiOperation({
        summary: "Upload local data zip for partner",
        description:
            "Provider device exports local data as a zip and uploads it here. Requester can then download it."
    })
    @ApiParam({
        name: "id",
        description: "Sync request id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
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
        description: "Zip uploaded",
        type: SyncRequestActionResponseDto
    })
    @ApiBadRequestResponse({
        description: "Missing zip, invalid file type, expired request, or file too large"
    })
    @ApiForbiddenResponse({
        description: "Only provider can upload"
    })
    @ApiNotFoundResponse({
        description: "Sync request not found"
    })
    @UseInterceptors(
        FileInterceptor("file", {
            storage: memoryStorage(),
            limits: { fileSize: 300 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                const allowedMimeTypes = new Set([
                    "application/zip",
                    "application/x-zip",
                    "application/x-zip-compressed",
                    "multipart/x-zip",
                    "application/octet-stream"
                ]);
                const hasZipExtension = extname(file.originalname || "").toLowerCase() === ".zip";
                if (!hasZipExtension && !allowedMimeTypes.has(file.mimetype)) {
                    return cb(new BadRequestException("Only .zip sync files are supported") as any, false);
                }
                return cb(null, true);
            }
        })
    )
    async uploadZip(@Req() req, @Param("id") id: string, @UploadedFile() file: any) {
        if (!file) throw new BadRequestException("Zip file is required");
        const syncRequest = await this.syncRequestsService.uploadZip(this.getCurrentUserId(req), id, file);
        return { success: true, ...toSyncRequestResponse(syncRequest) };
    }

    @Get(":id/download")
    @ApiOperation({
        summary: "Download partner data zip",
        description:
            "Requester downloads the uploaded zip and imports it locally. Call confirm after import succeeds."
    })
    @ApiParam({
        name: "id",
        description: "Sync request id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Zip file stream"
    })
    @ApiBadRequestResponse({
        description: "Zip is not uploaded or request expired"
    })
    @ApiForbiddenResponse({
        description: "Only requester can download"
    })
    @ApiNotFoundResponse({
        description: "Sync request or zip not found"
    })
    async downloadZip(
        @Req() req,
        @Param("id") id: string,
        @Res({ passthrough: true }) res: Response
    ) {
        const payload = await this.syncRequestsService.prepareDownload(this.getCurrentUserId(req), id);
        res.set({
            "Content-Type": payload.mimeType,
            "Content-Length": String(payload.fileSize),
            "Content-Disposition": `attachment; filename="${this.escapeHeaderFileName(payload.fileName)}"`,
            "X-Sync-Request-Id": payload.syncRequest.id,
            "X-Sync-Request-Status": payload.syncRequest.status
        });
        return new StreamableFile(createReadStream(payload.filePath));
    }

    @Post(":id/confirm")
    @ApiOperation({
        summary: "Confirm zip imported locally",
        description: "Requester calls this after importing the zip. Server deletes the temporary zip payload."
    })
    @ApiParam({
        name: "id",
        description: "Sync request id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Import confirmed and server payload deleted",
        type: SyncRequestActionResponseDto
    })
    @ApiForbiddenResponse({
        description: "Only requester can confirm"
    })
    @ApiNotFoundResponse({
        description: "Sync request not found"
    })
    async confirmImported(@Req() req, @Param("id") id: string) {
        const syncRequest = await this.syncRequestsService.confirmImported(this.getCurrentUserId(req), id);
        return { success: true, ...toSyncRequestResponse(syncRequest) };
    }

    @Post(":id/cancel")
    @ApiOperation({
        summary: "Cancel my sync request",
        description: "Requester can cancel and delete the temporary zip if it exists."
    })
    @ApiParam({
        name: "id",
        description: "Sync request id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Sync request cancelled",
        type: SyncRequestActionResponseDto
    })
    async cancelRequest(@Req() req, @Param("id") id: string) {
        const syncRequest = await this.syncRequestsService.cancelRequest(this.getCurrentUserId(req), id);
        return { success: true, ...toSyncRequestResponse(syncRequest) };
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }

    private escapeHeaderFileName(value: string) {
        return value.replace(/["\\\r\n]+/g, "-");
    }
}
