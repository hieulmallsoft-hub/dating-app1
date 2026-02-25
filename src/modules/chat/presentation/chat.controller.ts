import { Controller, Get, Post, Body, Req, UseGuards, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from '../application/chat.service';
import { JwtAuthGuard } from '../../auth/infrastructure/strategies/jwt-auth-guard';

@ApiBearerAuth('JWT-auth')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  async getMessages(
    @Req() req,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.chatService.getMessages(req.user.sub, limit, offset);
  }

  @Post('clear')
  @HttpCode(HttpStatus.OK)
  async clearChat(@Req() req) {
    return this.chatService.clearChat(req.user.sub);
  }
}
