import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Put,
    Req,
    UnauthorizedException
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiExcludeController,
    ApiExcludeEndpoint,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { UsersService } from "../application/user.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserLocationDto } from "./dto/update-user-location.dto";
import {
    DeleteUserResponseDto,
    UpdateUserLocationResponseDto,
    UserProfileResponseDto
} from "./dto/user-ops.dto";
import { toApiUser } from "./mappers/user-response.mapper";
import { Public } from "src/common/decorators/customize";

@ApiTags("users")
@ApiBearerAuth("JWT-auth")
@ApiExcludeController()
@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get("me")
    @ApiOperation({
        summary: "Get current user profile",
        description: "Requires JWT access token."
    })
    @ApiOkResponse({
        description: "Returns current user profile",
        type: UserProfileResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getProfile(@Req() req) {
        const user = await this.usersService.getProfile(this.getCurrentUserId(req));
        return toApiUser(user);
    }

    @Get("email/:email")
    @Public()
    @ApiExcludeEndpoint()
    @ApiOperation({
        summary: "Get user by email",
        description: "Public endpoint. Returns user info or null."
    })
    @ApiParam({
        name: "email",
        description: "User email",
        example: "user@example.com"
    })
    @ApiOkResponse({
        description: "Found user or null",
        type: UserProfileResponseDto
    })
    async getUserByEmail(@Param("email") email: string) {
        const user = await this.usersService.getUserByEmail(email);
        return toApiUser(user);
    }

    @Put("me")
    @ApiOperation({
        summary: "Update current user profile",
        description: "Update editable profile fields for current user."
    })
    @ApiOkResponse({
        description: "Profile updated",
        type: UserProfileResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload or protected fields provided"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto) {
        const user = await this.usersService.updateProfile(this.getCurrentUserId(req), updateUserDto);
        return toApiUser(user);
    }

    @Put("me/location")
    @ApiOperation({
        summary: "Update current user location",
        description: "Submit latest GPS location and device state for couple tracking."
    })
    @ApiOkResponse({
        description: "Location updated",
        type: UpdateUserLocationResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid lat/lng or optional metrics out of allowed range"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateProfileLocation(@Req() req, @Body() dto: UpdateUserLocationDto) {
        return this.usersService.updateMyLocation(
            this.getCurrentUserId(req),
            dto.lat,
            dto.lng,
            dto.accuracy,
            dto.batteryLevel,
            dto.isCharging,
            dto.speed,
            dto.timestamp
        );
    }

    @Delete("me")
    @ApiOperation({
        summary: "Delete current user account",
        description: "Delete logged-in user and related data."
    })
    @ApiOkResponse({
        description: "User deleted",
        type: DeleteUserResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async deleteMyAccount(@Req() req) {
        return this.usersService.deleteUser(this.getCurrentUserId(req));
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }

}

