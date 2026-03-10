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
        summary: "L?y h? so ngu?i dùng hi?n t?i",
        description: "Yêu c?u JWT access token."
    })
    @ApiOkResponse({
        description: "Tr? v? h? so ngu?i dùng hi?n t?i",
        type: UserProfileResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getMe(@Req() req) {
        const user = await this.usersService.getUserById(this.getCurrentUserId(req));
        return toApiUser(user);
    }

    @Get("email/:email")
    @Public()
    @ApiExcludeEndpoint()
    @ApiOperation({
        summary: "L?y ngu?i dùng theo email",
        description: "Endpoint công khai. Tr? v? thông tin ngu?i dùng ho?c null."
    })
    @ApiParam({
        name: "email",
        description: "Email ngu?i dùng",
        example: "user@example.com"
    })
    @ApiOkResponse({
        description: "Tìm th?y ngu?i dùng ho?c null",
        type: UserProfileResponseDto
    })
    async getUserByEmail(@Param("email") email: string) {
        const user = await this.usersService.getUserByEmail(email);
        return toApiUser(user);
    }

    @Put("me")
    @ApiOperation({
        summary: "C?p nh?t h? so ngu?i dùng hi?n t?i",
        description: "C?p nh?t các tru?ng h? so du?c phép s?a c?a ngu?i dùng hi?n t?i."
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t h? so",
        type: UserProfileResponseDto
    })
    @ApiBadRequestResponse({
        description: "D? li?u không h?p l? ho?c ch?a tru?ng du?c b?o v?"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async updateMe(@Req() req, @Body() updateUserDto: UpdateUserDto) {
        const user = await this.usersService.updateUser(this.getCurrentUserId(req), updateUserDto);
        return toApiUser(user);
    }

    @Post("me/avatar")
    @ApiOperation({
        summary: "T?i lên và c?p nh?t ?nh d?i di?n ngu?i dùng hi?n t?i",
        description:
            "T?i ?nh d?i di?n b?ng multipart/form-data (field `file`). Backend luu file và t? d?ng c?p nh?t `users.avatar`."
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
        description: "Ðã c?p nh?t ?nh d?i di?n",
        type: UpdateAvatarResponseDto
    })
    @ApiBadRequestResponse({
        description: "Thi?u file, d?nh d?ng file không h? tr? ho?c d? li?u không h?p l?"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
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
                    "image/gif",
                    "image/jpg"
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
        summary: "C?p nh?t v? trí ngu?i dùng hi?n t?i",
        description: "G?i v? trí GPS m?i nh?t và tr?ng thái thi?t b? d? theo dõi c?p dôi."
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t v? trí",
        type: UpdateUserLocationResponseDto
    })
    @ApiBadRequestResponse({
        description: "lat/lng không h?p l? ho?c các ch? s? tùy ch?n vu?t ph?m vi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
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
        summary: "Xóa tài kho?n ngu?i dùng hi?n t?i",
        description: "Xóa ngu?i dùng dang dang nh?p và d? li?u liên quan."
    })
    @ApiOkResponse({
        description: "Ðã xóa ngu?i dùng",
        type: DeleteUserResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
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

