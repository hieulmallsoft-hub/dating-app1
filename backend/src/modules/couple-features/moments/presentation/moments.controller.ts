import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Req,
    UseGuards,
    Param,
    UnauthorizedException
} from "@nestjs/common";
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
        return this.momentsService.getFeed(this.getCurrentUserId(req));
    }

    @Post()
    async createMoment(@Req() req, @Body() dto: CreateMomentDto) {
        return this.momentsService.createMoment(this.getCurrentUserId(req), dto);
    }

    @Put(":id")
    async updateMoment(@Req() req, @Param("id") id: string, @Body() dto: UpdateMomentDto) {
        return this.momentsService.updateMoment(this.getCurrentUserId(req), id, dto);
    }

    @Delete(":id")
    async deleteMoment(@Req() req, @Param("id") id: string) {
        return this.momentsService.deleteMoment(this.getCurrentUserId(req), id);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}



