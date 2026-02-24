import { Controller, Get, Put, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from '../application/users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../auth/infrastructure/strategies/jwt-auth-guard';

@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getMe(@Req() req) {
    return this.usersService.getUserById(req.user.sub);
  }

  @Put()
  async updateMe(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(req.user.sub, updateUserDto);
  }

  @Delete()
  async deleteMe(@Req() req) {
    return this.usersService.deleteUser(req.user.sub);
  }
}
