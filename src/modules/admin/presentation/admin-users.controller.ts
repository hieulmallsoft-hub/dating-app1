import { Controller, Get, Patch, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { UsersService } from "@/modules/user/application/user.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/customize";
import { UserRole } from "src/modules/user/domain/entities/users.model";

@ApiBearerAuth("JWT-auth")
@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    async getAllUsers() {
        return this.usersService.getAllUsers();
    }

    @Get(":id")
    async getUserDetail(@Param("id", new ParseUUIDPipe()) id: string) {
        return this.usersService.getUserDetailForAdmin(id);
    }

    @Patch(":id/ban")
    async banUser(@Param("id", new ParseUUIDPipe()) id: string) {
        return this.usersService.banUser(id);
    }
}
