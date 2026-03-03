import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UnauthorizedException,
    UseGuards
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { MediaService } from "../application/media.service";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { CreateMediaDto } from "./dto/create-media.dto";
import { UpdateMediaDto } from "./dto/update-media.dto";
import { UpdateMediaStatusDto } from "./dto/update-media-status.dto";


@ApiBearerAuth("JWT-auth")
@Controller("media")
@UseGuards(JwtAuthGuard)
export class MediaController {
    constructor(private readonly mediaService: MediaService) {}

    @Get()
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
    createMedia(@Req() req, @Body() body: CreateMediaDto) {
        return this.mediaService.createForMyCouple(this.getCurrentUserId(req), body);
    }

    @Get(":id")
    getById(@Req() req, @Param("id") id: string) {
        return this.mediaService.getMediaById(this.getCurrentUserId(req), id);
    }
    
    @Get(":id/download")
    async getDownloadUrl(@Req() req, @Param("id") id: string) {
        const media = await this.mediaService.getMediaById(this.getCurrentUserId(req), id) as any;
        if (!media) {
            throw new NotFoundException("Media not found");
        }
        return { downloadUrl: media.downloadUrl };
    }

    @Patch(":id")
    update(@Req() req, @Param("id") id: string, @Body() body: UpdateMediaDto) {
        return this.mediaService.updateMedia(this.getCurrentUserId(req), id, body);
    }

    @Patch(":id/status")
    updateStatus(@Req() req, @Param("id") id: string, @Body() body: UpdateMediaStatusDto) {
        return this.mediaService.updateMediaStatus(this.getCurrentUserId(req), id, body.status);
    }

    @Delete(":id")
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


