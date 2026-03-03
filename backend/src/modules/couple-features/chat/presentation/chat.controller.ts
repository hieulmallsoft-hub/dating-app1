import { Controller, Get, Post, Req, UseGuards, Query, HttpCode, HttpStatus, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ChatService } from "../application/chat.service";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";

@ApiBearerAuth("JWT-auth")
@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get("messages")
    async getMessages(@Req() req, @Query("limit") limit: number = 50, @Query("offset") offset: number = 0) {
        return this.chatService.getMessages(this.getCurrentUserId(req), limit, offset);
    }

    @Post("clear")
    @HttpCode(HttpStatus.OK)
    async clearChat(@Req() req) {
        return this.chatService.clearChat(this.getCurrentUserId(req));
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}



