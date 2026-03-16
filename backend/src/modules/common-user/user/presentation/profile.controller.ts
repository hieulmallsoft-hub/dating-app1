import {
    Body,
    Controller,
    Delete,
    Get,
    Put,
    Req,
    UnauthorizedException
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
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

@ApiTags("profile")
@ApiBearerAuth("JWT-auth")
@Controller("profile")
export class ProfileController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @ApiOperation({
        summary: "getProfile",
        description: "Get current user profile."
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

    @Put()
    @ApiOperation({
        summary: "updateProfile",
        description: "Update current user profile fields."
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

    @Put("location")
    @ApiOperation({
        summary: "updateProfileLocation",
        description: "Update current user live location."
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
            dto.speed
        );
    }

    @Delete()
    @ApiOperation({
        summary: "deleteMyAccount",
        description: "Delete current user account."
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
