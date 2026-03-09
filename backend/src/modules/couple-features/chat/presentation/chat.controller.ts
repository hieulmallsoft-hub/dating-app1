import { Controller, Get, Post, Req, UseGuards, Query, HttpCode, HttpStatus, UnauthorizedException } from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { ChatService } from "../application/chat.service";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";

@ApiTags("chat")
@ApiBearerAuth("JWT-auth")
@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get("messages")
    @ApiOperation({
        summary: "Get chat messages",
        description: "Returns paginated chat messages for current couple."
    })
    @ApiQuery({
        name: "limit",
        required: false,
        description: "Number of messages to return",
        example: 50
    })
    @ApiQuery({
        name: "offset",
        required: false,
        description: "Number of messages to skip",
        example: 0
    })
    @ApiOkResponse({
        description: "Chat messages returned"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getMessages(@Req() req, @Query("limit") limit: number = 50, @Query("offset") offset: number = 0) {
        return this.chatService.getMessages(this.getCurrentUserId(req), limit, offset);
    }

    @Post("clear")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Clear chat messages",
        description: "Clears chat history for current couple."
    })
    @ApiOkResponse({
        description: "Chat cleared",
        schema: { type: "object", properties: { success: { type: "boolean", example: true } } }
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
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



