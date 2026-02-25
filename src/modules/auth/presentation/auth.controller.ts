import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Req, Logger, Res } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../application/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto, RefreshTokenDto } from './dto/auth-ops.dto';
import { JwtAuthGuard } from '../infrastructure/strategies/jwt-auth-guard';
import { Public } from 'src/common/decorators/customize';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {}

  // register
  @Post('register')
  @Public()
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    this.logger.log(`Register request for email: ${registerDto.email}`);
    try {
      const user = await this.authService.register(registerDto);
      this.logger.log(`Đăng ký thành công: ${registerDto.email}`);
      
      // Auto-login after registration
      const { tokens } = await this.authService.generateTokens(user);
      this.setTokensCookie(res, tokens);
      
      return { user, tokens };
    } catch (error) {
      this.logger.error(`Lỗi khi đăng ký: ${error.message}`, error.stack);
      throw error;
    }
  }
  //login
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    this.setTokensCookie(res, result.tokens);
    return { user: result.user, tokens: result.tokens };
  }

  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile')
  getProfile(@Req() req: Request & { user: any }) {
    return req.user;
  }

  // Google Auth
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const result = await this.authService.validateSocialUser(req.user);
    this.setTokensCookie(res, result.tokens);
    
    const frontendUrl = this.configService.get('CORS_ORIGIN') || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}?access_token=${result.tokens.access_token}&refresh_token=${result.tokens.refresh_token}`);
  }

  // Apple Auth
  @Public()
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  async appleAuth(@Req() req) {}

  @Public()
  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleAuthRedirect(@Req() req, @Res() res: Response) {
    const result = await this.authService.validateSocialUser(req.user);
    this.setTokensCookie(res, result.tokens);
    
    const frontendUrl = this.configService.get('CORS_ORIGIN') || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}?access_token=${result.tokens.access_token}&refresh_token=${result.tokens.refresh_token}`);
  }

  // Social Login POST (for Mobile/Android/iOS)
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() socialLoginDto: SocialLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithGoogle(socialLoginDto.idToken);
    this.setTokensCookie(res, result.tokens);
    return { user: result.user, tokens: result.tokens };
  }

  @Public()
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  async appleLogin(@Body() socialLoginDto: SocialLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithApple(socialLoginDto.idToken);
    this.setTokensCookie(res, result.tokens);
    return { user: result.user, tokens: result.tokens };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.refreshToken(refreshTokenDto.refreshToken);
    this.setTokensCookie(res, result.tokens);
    return { user: result.user, tokens: result.tokens };
  }

  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return this.authService.logout(req.user.id || req.user.sub);
  }

  private setTokensCookie(res: Response, tokens: { access_token: string; refresh_token: string }) {
    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000, // 1 hour
    });
    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600000, // 30 days
    });
  }
}
