import { Controller, Get, Query, Req, UseGuards, Param, Post, Body, UnauthorizedException, Patch, Delete } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { MediaService } from "../application/media.service";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";
import { AddMediaDto } from "./dto/addmedia.dto";
import { CreateMediaDto } from "./dto/create-media.dto";
import { UpdateMediaDto } from "./dto/update-media.dto";
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

    @Post()
    createMedia(@Req() req, @Body() body: CreateMediaDto) {
        return this.mediaService.createForMyCouple(this.getCurrentUserId(req), body);
    }

    @Get(":id")
    getById(@Req() req, @Param("id") id: string) {
        return this.mediaService.getMediaById(this.getCurrentUserId(req), id);
    }

    @Get(":id/download-url")
    async getDownloadUrl(@Req() req, @Param("id") id: string) {
        const media = await this.mediaService.getMediaById(this.getCurrentUserId(req), id);
        return { url: media.url };
    }

    @Post("album")
    addToAlbum(@Req() req, @Body() body: AddMediaDto) {
        return this.mediaService.addMedia(
            this.getCurrentUserId(req),
            body.coupleId,
            body.url,
            body.type ?? "image"
        );
    }

    @Patch(":id")
    update(@Req() req, @Param("id") id: string, @Body() body: UpdateMediaDto) {
        return this.mediaService.updateMedia(this.getCurrentUserId(req), id, body);
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
