import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Req,
    UnauthorizedException,
    UploadedFile,
    UseInterceptors
} from "@nestjs/common";
import {
    ApiBody,
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConsumes,
    ApiExcludeEndpoint,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { UploadsService } from "../../uploads/application/uploads.service";
import { UsersService } from "../application/user.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserLocationDto } from "./dto/update-user-location.dto";
import {
    DeleteUserResponseDto,
    UpdateAvatarResponseDto,
    UpdateUserLocationResponseDto,
    UserProfileResponseDto
} from "./dto/user-ops.dto";
import { toApiUser } from "./mappers/user-response.mapper";
import { Public } from "src/common/decorators/customize";

@ApiTags("users")
@ApiBearerAuth("JWT-auth")
@Controller("users")
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly uploadsService: UploadsService
    ) {}

    @Get("me")
    @ApiOperation({
        summary: "Get current user profile",
        description: "Requires JWT access token."
    })
    @ApiOkResponse({
        description: "Current user profile returned",
        type: UserProfileResponseDto
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
        description: "User found or null",
        type: UserProfileResponseDto
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
        description: "Profile updated",
        type: UserProfileResponseDto
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

    @Post("me/avatar")
    @ApiOperation({
        summary: "Upload and update current user avatar",
        description:
            "Upload avatar image using multipart/form-data (field `file`). Backend stores file and updates `users.avatar` automatically."
    })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                file: { type: "string", format: "binary" }
            },
            required: ["file"]
        }
    })
    @ApiOkResponse({
        description: "Avatar updated",
        type: UpdateAvatarResponseDto
    })
    @ApiBadRequestResponse({
        description: "Missing file, unsupported file type, or validation failed"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    @UseInterceptors(
        FileInterceptor("file", {
            storage: memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for avatar
            fileFilter: (_req, file, cb) => {
                const allowedMimeTypes = new Set([
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/gif"
                ]);

                if (!allowedMimeTypes.has(file.mimetype)) {
                    return cb(new BadRequestException("Avatar must be an image file") as any, false);
                }

                return cb(null, true);
            }
        })
    )
    async updateMyAvatar(@Req() req, @UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException("File is required");
        }

        const uploaded = await this.uploadsService.uploadFile(file);
        if (uploaded.type !== "image") {
            throw new BadRequestException("Avatar must be an image file");
        }

        const user = await this.usersService.updateUser(this.getCurrentUserId(req), {
            avatar: uploaded.fileUrl
        });

        return {
            avatar: uploaded.fileUrl,
            fileName: uploaded.fileName,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
            user: toApiUser(user)
        };
    }

    @Put("me/location")
    @ApiOperation({
        summary: "Update current user location",
        description: "Sends latest GPS location and device status for couple tracking."
    })
    @ApiOkResponse({
        description: "Location updated",
        type: UpdateUserLocationResponseDto
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

    @Delete("me")
    @ApiOperation({
        summary: "Delete current user account",
        description: "Deletes current authenticated user and related account data."
    })
    @ApiOkResponse({
        description: "User deleted",
        type: DeleteUserResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async deleteMe(@Req() req) {
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
