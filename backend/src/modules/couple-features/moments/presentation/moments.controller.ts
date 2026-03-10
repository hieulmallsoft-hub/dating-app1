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
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { MomentsService } from "../application/moments.service";
import {
    CreateMomentDto,
    MomentActionResponseDto,
    MomentResponseDto,
    UpdateMomentDto
} from "./dto/moment-ops.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";

@ApiTags("moments")
@ApiBearerAuth("JWT-auth")
@Controller("moments")
@UseGuards(JwtAuthGuard)
export class MomentsController {
    constructor(private readonly momentsService: MomentsService) {}

    @Get()
    @ApiOperation({
        summary: "L?y b?ng tin kho?nh kh?c",
        description: "Tr? v? b?ng tin kho?nh kh?c c?a c?p dôi hi?n t?i."
    })
    @ApiOkResponse({
        description: "Ðã tr? v? b?ng tin kho?nh kh?c",
        type: MomentResponseDto,
        isArray: true
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getFeed(@Req() req) {
        return this.momentsService.getFeed(this.getCurrentUserId(req));
    }

    @Post()
    @ApiOperation({
        summary: "T?o kho?nh kh?c",
        description: "T?o kho?nh kh?c. N?u có photos, album media s? du?c d?ng b? t? d?ng."
    })
    @ApiCreatedResponse({
        description: "Ðã t?o kho?nh kh?c",
        type: MomentResponseDto
    })
    @ApiBadRequestResponse({
        description: "D? li?u không h?p l? (privacy ho?c payload sai)"
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async createMoment(@Req() req, @Body() dto: CreateMomentDto) {
        return this.momentsService.createMoment(this.getCurrentUserId(req), dto);
    }

    @Put(":id")
    @ApiOperation({
        summary: "C?p nh?t kho?nh kh?c",
        description: "C?p nh?t kho?nh kh?c theo id."
    })
    @ApiParam({
        name: "id",
        description: "ID kho?nh kh?c",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t kho?nh kh?c",
        type: MomentResponseDto
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y kho?nh kh?c"
    })
    @ApiForbiddenResponse({
        description: "Ngu?i dùng hi?n t?i không ph?i ngu?i t?o kho?nh kh?c này"
    })
    @ApiBadRequestResponse({
        description: "D? li?u không h?p l?"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async updateMoment(@Req() req, @Param("id") id: string, @Body() dto: UpdateMomentDto) {
        return this.momentsService.updateMoment(this.getCurrentUserId(req), id, dto);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Xóa kho?nh kh?c",
        description: "Xóa kho?nh kh?c theo id."
    })
    @ApiParam({
        name: "id",
        description: "ID kho?nh kh?c",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã xóa kho?nh kh?c",
        type: MomentActionResponseDto
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y kho?nh kh?c"
    })
    @ApiForbiddenResponse({
        description: "Ngu?i dùng hi?n t?i không ph?i ngu?i t?o kho?nh kh?c này"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
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




