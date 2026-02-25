import {
    Controller,
    Post,
    Get,
    Put,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { AdminService } from "../application/admin.service";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { Roles } from "@/common/decorators/customize";
import { UserRole } from "../../user/domain/entities/users.model";
import { CreateAdminDto } from "./dto/admin.dto";
import { RolesGuard } from "@/common/guards/roles.guard";

@ApiBearerAuth("JWT-auth")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get("users")
    async getAllUsers() {
        return this.adminService.getAllUsers();
    }

    @Put("users/:id/ban")
    @HttpCode(HttpStatus.OK)
    async banUser(@Param("id") id: string) {
        return this.adminService.setBanStatus(id, true);
    }

    @Put("users/:id/unban")
    @HttpCode(HttpStatus.OK)
    async unbanUser(@Param("id") id: string) {
        return this.adminService.setBanStatus(id, false);
    }

    @Get("couples")
    async getAllCouples() {
        return this.adminService.getAllCouples();
    }

    @Get("stats")
    async getStats() {
        return this.adminService.getStats();
    }

    @Post()
    async createAdmin(@Body() createAdminDto: CreateAdminDto) {
        return this.adminService.createAdmin(createAdminDto);
    }

    @Get()
    async getAllAdmins() {
        return this.adminService.getAllAdmins();
    }

    @Get(":id")
    async getAdminById(@Param("id", new ParseUUIDPipe()) id: string) {
        return this.adminService.getAdminById(id);
    }
}
