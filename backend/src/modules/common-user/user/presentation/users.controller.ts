import { Controller, Get, Put, Delete, Body, Req, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UsersService } from "../application/user.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Public } from "src/common/decorators/customize";

@ApiTags("users")
@ApiBearerAuth("JWT-auth")
@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @Public()
    async getAllUsers() {
        return this.usersService.getAllUsers();
    }

    @Get("me")
    async getMe(@Req() req) {
        return this.usersService.getUserById(req.user.sub || req.user.id);
    }

    @Get("email/:email")
    @Public()
    async getUserByEmail(@Param("email") email: string) {
        return this.usersService.getUserByEmail(email);
    }

    @Get(":id")
    async getUserById(@Param("id") id: string) {
        return this.usersService.getUserById(id);
    }

    @Put("me")
    async updateMe(@Req() req, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.updateUser(req.user.sub || req.user.id, updateUserDto);
    }

    @Delete(":id")
    async deleteUser(@Param("id") id: string) {
        return this.usersService.deleteUser(id);
    }
}
