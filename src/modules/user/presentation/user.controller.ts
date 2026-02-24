import { Controller, Get, Param, Post, Put, Delete, Body } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Public } from 'src/common/decorators/customize';

@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}
  @Get()
  @Public()
  getAllUser(){
    return this.usersService.getAllUsers();
  }
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string) {
    console.log('🔥🔥🔥 CONTROLLER VERSION MỚI 🔥🔥🔥');
    const user = await this.usersService.getUserByEmail(email);
    console.log('USER =', user);
    return user;
  }
  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }
  @Put(':id')
  updateUser(@Param('id') id: string, @Body() user: CreateUserDto) {
    return this.usersService.updateUser(id, user);
  }
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
export default UserController;
