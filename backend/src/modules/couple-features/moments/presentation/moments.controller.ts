import { Controller, Get, Post, Put, Delete, Body, Req, UseGuards, Param } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { MomentsService } from "../application/moments.service";
import { CreateMomentDto, UpdateMomentDto } from "./dto/moment-ops.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";

@ApiBearerAuth("JWT-auth")
@Controller("moments")
@UseGuards(JwtAuthGuard)
export class MomentsController {
    constructor(private readonly momentsService: MomentsService) {}

    @Get()
    async getFeed(@Req() req) {
        return this.momentsService.getFeed(req.user.sub);
    }

    @Post()
    async createMoment(@Req() req, @Body() dto: CreateMomentDto) {
        return this.momentsService.createMoment(req.user.sub, dto);
    }

    @Put(":id")
    async updateMoment(@Req() req, @Param("id") id: string, @Body() dto: UpdateMomentDto) {
        return this.momentsService.updateMoment(req.user.sub, id, dto);
    }

    @Delete(":id")
    async deleteMoment(@Req() req, @Param("id") id: string) {
        return this.momentsService.deleteMoment(req.user.sub, id);
    }
}



