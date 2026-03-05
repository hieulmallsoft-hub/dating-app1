import { Controller, Get, Put, Delete, Body, Req, Param, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UsersService } from "../application/user.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserLocationDto } from "./dto/update-user-location.dto";
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
        return this.usersService.getUserById(this.getCurrentUserId(req));
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
        return this.usersService.updateUser(this.getCurrentUserId(req), updateUserDto);
    }

    @Put("me/location")
    async updateMyLocation(@Req() req, @Body() dto: UpdateUserLocationDto) {
        return this.usersService.updateMyLocation(
            this.getCurrentUserId(req),
            dto.lat,
            dto.lng,
            dto.accuracy,
            dto.batteryLevel,
            dto.isCharging,
            dto.speed
        );
    }

    @Delete(":id")
    async deleteUser(@Param("id") id: string) {
        return this.usersService.deleteUser(id);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}
