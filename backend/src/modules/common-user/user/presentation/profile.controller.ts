import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Put,
    Req,
    UnauthorizedException,
    UploadedFiles,
    UseInterceptors
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { UsersService } from "../application/user.service";
import { UploadsService } from "../../uploads/application/uploads.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserLocationDto } from "./dto/update-user-location.dto";
import {
    DeleteUserResponseDto,
    UpdateUserLocationResponseDto,
    UserProfileResponseDto
} from "./dto/user-ops.dto";
import { toApiUser } from "./mappers/user-response.mapper";

const ALLOWED_AVATAR_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif"
]);

type UploadedAvatarFiles = {
    avatar?: Array<any>;
    file?: Array<any>;
};

const avatarUploadOptions = {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
            return cb(new BadRequestException("Unsupported avatar file type") as any, false);
        }

        return cb(null, true);
    }
};

@ApiTags("profile")
@ApiBearerAuth("JWT-auth")
@Controller("profile")
export class ProfileController {
    constructor(
        private readonly usersService: UsersService,
        private readonly uploadsService: UploadsService
    ) {}

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
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: "avatar", maxCount: 1 },
                { name: "file", maxCount: 1 }
            ],
            avatarUploadOptions
        )
    )
    @ApiOperation({
        summary: "updateProfile",
        description:
            "Update current user profile fields. Supports application/json and multipart/form-data (avatar image file)."
    })
    @ApiConsumes("application/json", "multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                fullName: { type: "string", example: "Mai Nguyen" },
                gender: { type: "number", enum: [0, 1, 2], example: 1 },
                birthDate: { type: "string", format: "date-time", example: "2000-01-01T00:00:00.000Z" },
                avatar: {
                    type: "string",
                    format: "binary",
                    description: "Avatar image file for multipart/form-data"
                }
            }
        }
    })
    @ApiOkResponse({
        description: "Profile updated",
        type: UserProfileResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload, invalid avatar file, or protected fields provided"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateProfile(
        @Req() req,
        @Body() updateUserDto: UpdateUserDto,
        @UploadedFiles() files?: UploadedAvatarFiles
    ) {
        const payload = await this.withUploadedAvatar(updateUserDto, files);
        const user = await this.usersService.updateProfile(this.getCurrentUserId(req), payload);
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
            dto.speed,
            dto.timestamp
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

    private async withUploadedAvatar(updateUserDto: UpdateUserDto, files?: UploadedAvatarFiles) {
        const avatarFile = files?.avatar?.[0] ?? files?.file?.[0];
        if (!avatarFile) {
            return updateUserDto;
        }

        const uploaded = await this.uploadsService.uploadFile(avatarFile);
        return {
            ...updateUserDto,
            avatar: uploaded.fileUrl
        };
    }
}
