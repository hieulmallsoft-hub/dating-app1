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
import { CreateMomentDto, UpdateMomentDto } from "./dto/moment-ops.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";

@ApiTags("moments")
@ApiBearerAuth("JWT-auth")
@Controller("moments")
@UseGuards(JwtAuthGuard)
export class MomentsController {
    constructor(private readonly momentsService: MomentsService) {}

    @Get()
    @ApiOperation({
        summary: "Get moments feed",
        description: "Returns moments feed for current couple."
    })
    @ApiOkResponse({
        description: "Moments feed returned"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getFeed(@Req() req) {
        return this.momentsService.getFeed(this.getCurrentUserId(req));
    }

    @Post()
    @ApiOperation({
        summary: "Create moment",
        description: "Creates a moment. If photos provided, media album is synced automatically."
    })
    @ApiCreatedResponse({
        description: "Moment created"
    })
    @ApiBadRequestResponse({
        description: "Validation failed (invalid privacy or payload)"
    })
    @ApiNotFoundResponse({
        description: "Current user is not in a couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createMoment(@Req() req, @Body() dto: CreateMomentDto) {
        return this.momentsService.createMoment(this.getCurrentUserId(req), dto);
    }

    @Put(":id")
    @ApiOperation({
        summary: "Update moment",
        description: "Updates a moment by id."
    })
    @ApiParam({
        name: "id",
        description: "Moment id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Moment updated"
    })
    @ApiNotFoundResponse({
        description: "Moment not found"
    })
    @ApiForbiddenResponse({
        description: "Current user is not the creator of this moment"
    })
    @ApiBadRequestResponse({
        description: "Validation failed"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateMoment(@Req() req, @Param("id") id: string, @Body() dto: UpdateMomentDto) {
        return this.momentsService.updateMoment(this.getCurrentUserId(req), id, dto);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Delete moment",
        description: "Deletes a moment by id."
    })
    @ApiParam({
        name: "id",
        description: "Moment id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Moment deleted",
        schema: { type: "object", properties: { success: { type: "boolean", example: true } } }
    })
    @ApiNotFoundResponse({
        description: "Moment not found"
    })
    @ApiForbiddenResponse({
        description: "Current user is not the creator of this moment"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
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



