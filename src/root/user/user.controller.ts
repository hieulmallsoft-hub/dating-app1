import { Controller, Get, Param, Post, Put, Delete, Body } from '@nestjs/common';
import { UsersService } from '../../module/common/domain/service/users.service';

@Controller('users')
export class UserController {
    constructor(private readonly usersService: UsersService) {}
    @Get()
    getAllUsers(){
        return this.usersService.getAllUsers()
    }
    @Get(':id')
    getUserById(@Param('id') id: string){
        return this.usersService.getUserById(Number(id))
    }
    @Post()
    createUser(@Body() user: any){
        return this.usersService.createUser(user)
    }
    @Put(':id')
    updateUser(@Param('id') id: string, @Body() user: any){
        return this.usersService.updateUser(Number(id), user)
    }
    @Delete(':id')
    deleteUser(@Param('id') id: string){
        return this.usersService.deleteUser(Number(id))
    }
}
export default UserController;
