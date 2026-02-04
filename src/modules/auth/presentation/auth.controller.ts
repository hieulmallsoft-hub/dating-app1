import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Req, Logger } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../application/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../infrastructure/strategies/jwt-auth-guard';
import { Public } from 'src/common/decorators/customize';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}
  // register
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`Register request for email: ${registerDto.email}`);
    try {
      const result = await this.authService.register(registerDto);
      this.logger.log(`Đăng ký thành công: ${registerDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Lỗi khi đăng ký: ${error.message}`, error.stack);
      throw error;
    }
  }
//login
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request & { user: any }) {
    return req.user;
  }
}
