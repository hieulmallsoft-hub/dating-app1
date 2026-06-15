import {
    Controller,
    Get,
    Post,
    Req,
    Res,
    UseGuards,
    Query,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    Param
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiExcludeEndpoint,
    ApiNotFoundResponse,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import type { Response } from "express";
import { ChatService } from "../application/chat.service";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { ChatActionResponseDto, ChatMessageResponseDto } from "./dto/chat-ops.dto";
import { toChatMessageResponseList } from "./mappers/chat-response.mapper";

@ApiTags("chat")
@ApiBearerAuth("JWT-auth")
@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get("history")
    @ApiOperation({
        summary: "Get chat messages",
        description: "Returns paginated chat messages for current couple."
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Number of messages to fetch",
        example: 50
    })
    @ApiQuery({
        name: "offset",
        required: false,
        type: Number,
        description: "Number of messages to skip",
        example: 0
    })
    @ApiOkResponse({
        description: "Returns chat message list",
        type: ChatMessageResponseDto,
        isArray: true
    })
    @ApiNoContentResponse({
        description: "No chat messages available. No response body."
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getChatHistory(
        @Req() req,
        @Res({ passthrough: true }) res: Response,
        @Query("limit") limit?: string,
        @Query("offset") offset?: string
    ) {
        const safeLimit = this.normalizeLimit(limit);
        const safeOffset = this.normalizeOffset(offset);
        const messages = await this.chatService.getMessages(this.getCurrentUserId(req), safeLimit, safeOffset);
        if (!messages.length) {
            res.status(HttpStatus.NO_CONTENT);
            return;
        }
        return toChatMessageResponseList(messages);
    }

    @Get("messages")
    @ApiExcludeEndpoint()
    async getMessagesLegacy(
        @Req() req,
        @Res({ passthrough: true }) res: Response,
        @Query("limit") limit?: string,
        @Query("offset") offset?: string
    ) {
        return this.getChatHistory(req, res, limit, offset);
    }

    @Post("history/clear")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Delete chat history",
        description: "Delete all chat history of current couple."
    })
    @ApiOkResponse({
        description: "Chat history deleted",
        type: ChatActionResponseDto
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async clearChatHistory(@Req() req) {
        return this.chatService.clearChat(this.getCurrentUserId(req));
    }

    @Post("clear")
    @HttpCode(HttpStatus.OK)
    @ApiExcludeEndpoint()
    async clearChatLegacy(@Req() req) {
        return this.clearChatHistory(req);
    }

    @Post(":id/sync/confirm")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: "Confirm message synced locally",
        description:
            "Call after the current device has downloaded and saved the message locally. Server clears payload after both couple users confirm."
    })
    @ApiNoContentResponse({
        description: "Message sync confirmation saved. No response body."
    })
    @ApiNotFoundResponse({
        description: "Message not found in current couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async confirmMessageSynced(@Req() req, @Param("id") id: string) {
        await this.chatService.confirmMessageSynced(this.getCurrentUserId(req), id);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }

    private normalizeLimit(value?: string) {
        const parsed = value ? Number(value) : NaN;
        if (!Number.isFinite(parsed)) {
            return 50;
        }
        return Math.max(1, Math.min(100, Math.floor(parsed)));
    }

    private normalizeOffset(value?: string) {
        const parsed = value ? Number(value) : NaN;
        if (!Number.isFinite(parsed)) {
            return 0;
        }
        return Math.max(0, Math.floor(parsed));
    }
}




