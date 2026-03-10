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
import { ChatActionResponseDto, ChatMessageResponseDto } from "./dto/chat-ops.dto";

@ApiTags("chat")
@ApiBearerAuth("JWT-auth")
@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get("messages")
    @ApiOperation({
        summary: "L?y tin nh?n chat",
        description: "Tr? v? danh sách tin nh?n chat có phân trang cho c?p dôi hi?n t?i."
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "S? lu?ng tin nh?n c?n l?y",
        example: 50
    })
    @ApiQuery({
        name: "offset",
        required: false,
        type: Number,
        description: "S? lu?ng tin nh?n c?n b? qua",
        example: 0
    })
    @ApiOkResponse({
        description: "Ðã tr? v? danh sách tin nh?n chat",
        type: ChatMessageResponseDto,
        isArray: true
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getMessages(@Req() req, @Query("limit") limit: number = 50, @Query("offset") offset: number = 0) {
        return this.chatService.getMessages(this.getCurrentUserId(req), limit, offset);
    }

    @Post("clear")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Xóa l?ch s? chat",
        description: "Xóa toàn b? l?ch s? chat c?a c?p dôi hi?n t?i."
    })
    @ApiOkResponse({
        description: "Ðã xóa l?ch s? chat",
        type: ChatActionResponseDto
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
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




