import { Controller, Get, Patch, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { UsersService } from "src/modules/user/application/users.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/customize";
import { UserRole } from "src/modules/user/domain/entities/users.model";

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController {
    constructor(private readonly usersService: UsersService) {}
    
    @Get()
    async getAllUsers() {
        return this.usersService.getAllUsers();
    }

    @Get(':id')
    async getUserDetail(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.usersService.getUserDetailForAdmin(id);
    }

    @Patch(':id/ban')
    async banUser(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.usersService.banUser(id);
    }
}