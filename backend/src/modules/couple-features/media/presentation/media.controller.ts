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


@ApiTags("media")
@ApiBearerAuth("JWT-auth")
@Controller("media")
@UseGuards(JwtAuthGuard)
export class MediaController {
    constructor(private readonly mediaService: MediaService) {}

    @Get()
    @ApiOperation({
        summary: "L?y album media",
        description: "Tr? v? danh sách media có phân trang c?a c?p dôi hi?n t?i v?i filter + cursor."
    })
    @ApiQuery({
        name: "filter",
        required: false,
        description: "B? l?c ph?m vi ch? s? h?u media",
        enum: ["all", "me", "partner"],
        example: "all"
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Kích thu?c trang (du?c gi?i h?n b?i service)",
        example: 20
    })
    @ApiQuery({
        name: "cursor",
        required: false,
        description: "Cursor phân trang: ISO_DATE ho?c ISO_DATE|MEDIA_ID",
        example: "2026-03-09T08:00:00.000Z|7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã tr? v? m?t trang album",
        type: MediaAlbumResponseDto
    })
    @ApiBadRequestResponse({
        description: "filter/cursor không h?p l?"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getMedia(
        @Req() req,
        @Query("filter") filter: "all" | "me" | "partner" = "all",
        @Query("limit") limit?: string,
        @Query("cursor") cursor?: string
    ) {
        const parsedLimit = limit ? Number(limit) : 20;
        return this.mediaService.getAlbum(this.getCurrentUserId(req), filter, parsedLimit, cursor);
    }

    @Get("changes")
    @ApiOperation({
        summary: "Long-poll thay d?i media",
        description: "Ch? thay d?i album k? t? m?t version cho tru?c."
    })
    @ApiQuery({
        name: "since",
        required: false,
        type: Number,
        description: "S? version",
        example: 0
    })
    @ApiQuery({
        name: "timeoutMs",
        required: false,
        type: Number,
        description: "Th?i gian timeout long-poll (mili giây)",
        example: 25000
    })
    @ApiOkResponse({
        description: "Ðã tr? v? s? ki?n thay d?i ho?c ph?n h?i timeout",
        type: MediaChangesResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getMediaChanges(
        @Req() req,
        @Query("since") since?: string,
        @Query("timeoutMs") timeoutMs?: string
    ) {
        const parsedSince = since ? Number(since) : 0;
        const parsedTimeout = timeoutMs ? Number(timeoutMs) : 25000;
        return this.mediaService.waitForAlbumChange(this.getCurrentUserId(req), parsedSince, parsedTimeout);
    }

    @Post()
    @ApiOperation({
        summary: "T?o b?n ghi media",
        description: "T?o m?t media trong album c?a c?p dôi hi?n t?i."
    })
    @ApiCreatedResponse({
        description: "Ðã t?o media",
        type: MediaItemResponseDto
    })
    @ApiBadRequestResponse({
        description: "D? li?u không h?p l? (url/type/visibility...)"
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    createMedia(@Req() req, @Body() body: CreateMediaDto) {
        return this.mediaService.createForMyCouple(this.getCurrentUserId(req), body);
    }

    @Get(":id")
    @ApiOperation({
        summary: "L?y chi ti?t media theo id",
        description: "Tr? v? chi ti?t m?t media."
    })
    @ApiParam({
        name: "id",
        description: "ID media",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã tr? v? chi ti?t media",
        type: MediaItemResponseDto
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y media"
    })
    @ApiForbiddenResponse({
        description: "Media không thu?c c?p dôi c?a ngu?i dùng hi?n t?i"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    getById(@Req() req, @Param("id") id: string) {
        return this.mediaService.getMediaById(this.getCurrentUserId(req), id);
    }
    
    @Get(":id/download")
    @ApiOperation({
        summary: "L?y URL t?i xu?ng media",
        description: "Tr? v? URL t?i xu?ng an toàn c?a media."
    })
    @ApiParam({
        name: "id",
        description: "ID media",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã tr? v? URL t?i xu?ng",
        type: MediaDownloadResponseDto
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y media"
    })
    @ApiForbiddenResponse({
        description: "Media không thu?c c?p dôi c?a ngu?i dùng hi?n t?i"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getDownloadUrl(@Req() req, @Param("id") id: string) {
        const media = await this.mediaService.getMediaById(this.getCurrentUserId(req), id);
        return { downloadUrl: media.downloadUrl };
    }

    @Patch(":id")
    @ApiOperation({
        summary: "C?p nh?t media",
        description: "C?p nh?t caption/visibility/thumbUrl c?a media."
    })
    @ApiParam({
        name: "id",
        description: "ID media",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t media",
        type: MediaItemResponseDto
    })
    @ApiBadRequestResponse({
        description: "D? li?u không h?p l?"
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y media"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    update(@Req() req, @Param("id") id: string, @Body() body: UpdateMediaDto) {
        return this.mediaService.updateMedia(this.getCurrentUserId(req), id, body);
    }

    @Patch(":id/status")
    @ApiOperation({
        summary: "C?p nh?t media status",
        description: "C?p nh?t tr?ng thái x? lý c?a media."
    })
    @ApiParam({
        name: "id",
        description: "ID media",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t tr?ng thái",
        type: MediaItemResponseDto
    })
    @ApiBadRequestResponse({
        description: "Tr?ng thái không h?p l?"
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y media"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    updateStatus(@Req() req, @Param("id") id: string, @Body() body: UpdateMediaStatusDto) {
        return this.mediaService.updateMediaStatus(this.getCurrentUserId(req), id, body.status);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Xóa media",
        description: "Xóa m?m media theo id."
    })
    @ApiParam({
        name: "id",
        description: "ID media",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã xóa media",
        type: MediaActionResponseDto
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y media"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    remove(@Req() req, @Param("id") id: string) {
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



