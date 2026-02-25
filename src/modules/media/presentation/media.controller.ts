import { Controller, Get, Query, Req, UseGuards, Param } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { MediaService } from "../application/media.service";
import { JwtAuthGuard } from "../../auth/infrastructure/strategies/jwt-auth-guard";

@ApiBearerAuth("JWT-auth")
@Controller("media")
@UseGuards(JwtAuthGuard)
export class MediaController {
    constructor(private readonly mediaService: MediaService) {}

    @Get()
    async getMedia(@Req() req, @Query("filter") filter: "all" | "me" | "partner" = "all") {
        return this.mediaService.getAlbum(req.user.sub, filter);
    }

    @Get(":id/download-url")
    async getDownloadUrl(@Req() req, @Param("id") id: string) {
        // In a real app with S3, you'd generate a presigned download URL here.
        // For now, we'll just mock it or return the direct URL if it's public.
        return { url: `mock-download-url-for-${id}` };
    }
}
