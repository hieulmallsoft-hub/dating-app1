import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UnauthorizedException,
    UseGuards
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
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { MediaService } from "../application/media.service";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { CreateMediaDto } from "./dto/create-media.dto";
import {
    MediaActionResponseDto,
    MediaAlbumResponseDto,
    MediaChangesResponseDto,
    MediaDownloadResponseDto,
    MediaItemResponseDto
} from "./dto/media-ops.dto";
import { UpdateMediaDto } from "./dto/update-media.dto";
import { UpdateMediaStatusDto } from "./dto/update-media-status.dto";
import {
    toMediaItemResponse,
    toMediaItemResponseList
} from "./mappers/media-response.mapper";


@ApiTags("media")
@ApiBearerAuth("JWT-auth")
@Controller("media")
@UseGuards(JwtAuthGuard)
export class MediaController {
    constructor(private readonly mediaService: MediaService) {}

    @Get()
    @ApiOperation({
        summary: "Get media album",
        description: "Returns paginated media list for current couple by filter + cursor."
    })
    @ApiQuery({
        name: "filter",
        required: false,
        description: "Ownership filter for media scope",
        enum: ["all", "me", "partner"],
        example: "all"
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Page size (clamped by service)",
        example: 20
    })
    @ApiQuery({
        name: "cursor",
        required: false,
        description: "Pagination cursor: ISO_DATE or ISO_DATE|MEDIA_ID",
        example: "2026-03-09T08:00:00.000Z|7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Returns one album page",
        type: MediaAlbumResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid filter/cursor"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getMediaAlbum(
        @Req() req,
        @Query("filter") filter: "all" | "me" | "partner" = "all",
        @Query("limit") limit?: string,
        @Query("cursor") cursor?: string
    ) {
        const parsedLimit = limit ? Number(limit) : 20;
        const album = await this.mediaService.getAlbum(this.getCurrentUserId(req), filter, parsedLimit, cursor);
        return {
            items: toMediaItemResponseList(album.items),
            nextCursor: album.nextCursor
        };
    }

    @Get("changes")
    @ApiOperation({
        summary: "Long-poll media changes",
        description: "Only return album changes since a previous version."
    })
    @ApiQuery({
        name: "since",
        required: false,
        type: Number,
        description: "Version number",
        example: 0
    })
    @ApiQuery({
        name: "timeoutMs",
        required: false,
        type: Number,
        description: "Long-poll timeout in milliseconds",
        example: 25000
    })
    @ApiOkResponse({
        description: "Returns change event or timeout response",
        type: MediaChangesResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getMediaAlbumChanges(
        @Req() req,
        @Query("since") since?: string,
        @Query("timeoutMs") timeoutMs?: string
    ) {
        const parsedSince = since ? Number(since) : 0;
        const parsedTimeout = timeoutMs ? Number(timeoutMs) : 10000;
        return this.mediaService.waitForAlbumChange(this.getCurrentUserId(req), parsedSince, parsedTimeout);
    }

    @Post()
    @ApiOperation({
        summary: "Create media item",
        description: "Create one media item in current couple album."
    })
    @ApiCreatedResponse({
        description: "Media created",
        type: MediaItemResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload (url/type/visibility...)"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createMedia(@Req() req, @Body() body: CreateMediaDto) {
        const media = await this.mediaService.createForMyCouple(this.getCurrentUserId(req), body);
        return toMediaItemResponse(media);
    }

    @Get(":id")
    @ApiOperation({
        summary: "Get media details by id",
        description: "Returns one media detail."
    })
    @ApiParam({
        name: "id",
        description: "Media ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Returns media detail",
        type: MediaItemResponseDto
    })
    @ApiNotFoundResponse({
        description: "Media not found"
    })
    @ApiForbiddenResponse({
        description: "Media does not belong to current user's couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getMediaDetail(@Req() req, @Param("id") id: string) {
        const media = await this.mediaService.getMediaById(this.getCurrentUserId(req), id);
        return toMediaItemResponse(media);
    }
    
    @Get(":id/download")
    @ApiOperation({
        summary: "Get media download URL",
        description: "Returns secure download URL for media."
    })
    @ApiParam({
        name: "id",
        description: "Media ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Returns download URL",
        type: MediaDownloadResponseDto
    })
    @ApiNotFoundResponse({
        description: "Media not found"
    })
    @ApiForbiddenResponse({
        description: "Media does not belong to current user's couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getMediaDownloadUrl(@Req() req, @Param("id") id: string) {
        const media = await this.mediaService.getMediaById(this.getCurrentUserId(req), id);
        return { downloadUrl: media.downloadUrl };
    }

    @Patch(":id")
    @ApiOperation({
        summary: "Update media",
        description: "Update media caption/visibility/thumbUrl."
    })
    @ApiParam({
        name: "id",
        description: "Media ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Media updated",
        type: MediaItemResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload"
    })
    @ApiNotFoundResponse({
        description: "Media not found"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateMediaDetail(@Req() req, @Param("id") id: string, @Body() body: UpdateMediaDto) {
        const media = await this.mediaService.updateMedia(this.getCurrentUserId(req), id, body);
        return toMediaItemResponse(media);
    }

    @Patch(":id/status")
    @ApiOperation({
        summary: "Update media processing status",
        description: "Update media processing status."
    })
    @ApiParam({
        name: "id",
        description: "Media ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Status updated",
        type: MediaItemResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid status"
    })
    @ApiNotFoundResponse({
        description: "Media not found"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateMediaStatus(@Req() req, @Param("id") id: string, @Body() body: UpdateMediaStatusDto) {
        const media = await this.mediaService.updateMediaStatus(this.getCurrentUserId(req), id, body.status);
        return toMediaItemResponse(media);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Delete media",
        description: "Soft delete media by id."
    })
    @ApiParam({
        name: "id",
        description: "Media ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Media deleted",
        type: MediaActionResponseDto
    })
    @ApiNotFoundResponse({
        description: "Media not found"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    deleteMedia(@Req() req, @Param("id") id: string) {
        return this.mediaService.deleteMedia(this.getCurrentUserId(req), id);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}



