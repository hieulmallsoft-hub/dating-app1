import { Controller, Get, Put, Delete, Body, Req, Param, UnauthorizedException } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
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
import { toApiUser } from "./mappers/user-response.mapper";
import { Public } from "src/common/decorators/customize";

@ApiTags("users")
@ApiBearerAuth("JWT-auth")
@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get("me")
    @ApiOperation({
        summary: "Get current user profile",
        description: "Requires JWT access token."
    })
    @ApiOkResponse({
        description: "Current user profile returned"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getMe(@Req() req) {
        const user = await this.usersService.getUserById(this.getCurrentUserId(req));
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
        description: "User found or null"
    })
    async getUserByEmail(@Param("email") email: string) {
        const user = await this.usersService.getUserByEmail(email);
        return toApiUser(user);
    }

    @Put("me")
    @ApiOperation({
        summary: "Update current user profile",
        description: "Update editable profile fields of current user."
    })
    @ApiOkResponse({
        description: "Profile updated"
    })
    @ApiBadRequestResponse({
        description: "Validation failed or protected fields provided"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateMe(@Req() req, @Body() updateUserDto: UpdateUserDto) {
        const user = await this.usersService.updateUser(this.getCurrentUserId(req), updateUserDto);
        return toApiUser(user);
    }

    @Put("me/location")
    @ApiOperation({
        summary: "Update current user location",
        description: "Sends latest GPS location and device status for couple tracking."
    })
    @ApiOkResponse({
        description: "Location updated"
    })
    @ApiBadRequestResponse({
        description: "Invalid lat/lng or optional metrics out of range"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateMyLocation(@Req() req, @Body() dto: UpdateUserLocationDto) {
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

    @Delete(":id")
    @ApiExcludeEndpoint()
    @ApiOperation({
        summary: "Delete user by id",
        description: "Deletes a user record by id."
    })
    @ApiParam({
        name: "id",
        description: "User id",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "User deleted",
        schema: {
            type: "object",
            properties: { message: { type: "string", example: "User deleted successfully" } }
        }
    })
    @ApiNotFoundResponse({
        description: "User not found"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async deleteUser(@Param("id") id: string) {
        return this.usersService.deleteUser(id);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }

}
