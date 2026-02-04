import { Controller, Post, Get, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AdminService } from '../application/admin.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CreateAdminDto } from './dto/admin.dto';


@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.createAdmin(createAdminDto);
  }

  @Get()
  async getAllAdmins() {
    return this.adminService.getAllAdmins();
  }

  @Get(':id')
  async getAdminById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.adminService.getAdminById(id);
  }
}
