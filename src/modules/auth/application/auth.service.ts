import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../user/application/users.service';
import { RegisterDto } from '../presentation/dto/register.dto';
import { LoginDto } from '../presentation/dto/login.dto';
import { comparePassword } from '../../../common/utils/utils';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email:string , pass: string): Promise<any> {
    const user = await this.usersService.getUserWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }
    const isPasswordMatching = await comparePassword(pass, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }
    return user;
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.getUserByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('Email đã tồn tại');
    }
    return this.usersService.createUser(registerDto);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.getUserWithPassword(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    // Sử dụng hàm comparePassword từ utils.ts
    const isPasswordMatching = await comparePassword(loginDto.password, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
