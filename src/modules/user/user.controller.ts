import { Controller, Get, Param, Post, Put, Delete, Body } from '@nestjs/common';
import { UsersService } from './user.service';

@Controller('users')
export class UserController {
    constructor(private readonly usersService: UsersService) { }
    @Get()
    getAllUsers() {
        return this.usersService.getAllUsers()
    }
    @Get(':id')
    getUserById(@Param('id') id: string) {
        return this.usersService.findOneById(Number(id))
    }
    @Post()
    createUser(@Body() user: any) {
        return this.usersService.create(user)
    }
    @Put(':id')
    updateUser(@Param('id') id: string, @Body() user: any) {
        return this.usersService.updateUser(Number(id), user)
    }
    @Delete(':id')
    deleteUser(@Param('id') id: string) {
        return this.usersService.deleteUser(Number(id))
    }
}
