import { Controller, Get, Post, Put, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CoupleService } from '../application/couple.service';
import { JoinCoupleDto, UpdateCoupleDto } from './dto/couple-ops.dto';
import { JwtAuthGuard } from '../../auth/infrastructure/strategies/jwt-auth-guard';

@ApiBearerAuth('JWT-auth')
@Controller('couple')
@UseGuards(JwtAuthGuard)
export class CoupleController {
  constructor(private readonly coupleService: CoupleService) {}

  @Get()
  async getCouple(@Req() req) {
    return this.coupleService.getMyCouple(req.user.sub);
  }

  @Post('invite')
  @HttpCode(HttpStatus.OK)
  async createInvite(@Req() req) {
    return this.coupleService.createInvite(req.user.sub);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  async joinCouple(@Req() req, @Body() joinCoupleDto: JoinCoupleDto) {
    return this.coupleService.joinCouple(req.user.sub, joinCoupleDto.inviteCode);
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnect(@Req() req) {
    return this.coupleService.disconnect(req.user.sub);
  }

  @Post('connect-new')
  @HttpCode(HttpStatus.OK)
  async connectNew(@Req() req, @Body() joinCoupleDto: JoinCoupleDto) {
    // Basic logic: Disconnect current and join new
    await this.coupleService.disconnect(req.user.sub).catch(() => {}); // ignore if not in couple
    return this.coupleService.joinCouple(req.user.sub, joinCoupleDto.inviteCode);
  }

  @Put('start-date')
  async setStartDate(@Req() req, @Body() updateCoupleDto: UpdateCoupleDto) {
    return this.coupleService.updateCouple(req.user.sub, { startDate: updateCoupleDto.startDate });
  }

  @Put('theme')
  async setTheme(@Req() req, @Body() updateCoupleDto: UpdateCoupleDto) {
    return this.coupleService.updateCouple(req.user.sub, { theme: updateCoupleDto.theme });
  }
}
