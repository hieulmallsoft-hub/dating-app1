import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Patch,
    Query,
    Req,
    UnauthorizedException,
    UploadedFiles,
    UseInterceptors
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiBody,
    ApiConflictResponse,
    ApiConsumes,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
    ApiTooManyRequestsResponse,
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
    LocationHistoryResponseDto,
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
        summary: "Lay thong tin profile cua user dang dang nhap",
        description:
            "API nay tra ve profile cua user hien tai dua tren JWT access token.\n\n" +
            "Logic xu ly:\n" +
            "- Doc userId tu token dang dang nhap.\n" +
            "- Neu user chua co accountCode hop le 6 chu so thi backend tu sinh accountCode moi.\n" +
            "- Neu user dang co couple ACTIVE, response kem startDate va startDateAt cua couple hien tai.\n" +
            "- Response chi tra ve cac field public can dung cho man profile, khong tra password/refresh token/cac field bao mat."
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

    @Patch()
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
        summary: "Cap nhat profile cua user dang dang nhap",
        description:
            "API nay cap nhat cac thong tin profile co the sua cua user hien tai.\n\n" +
            "Body hop le:\n" +
            "- fullName: ten hien thi, toi da 15 ky tu.\n" +
            "- gender: 0=MALE, 1=FEMALE, 2=OTHER.\n" +
            "- birthDate: ngay sinh dang ISO date-time.\n" +
            "- avatar: URL avatar neu client da co san URL.\n" +
            "- Khi upload anh avatar truc tiep, gui multipart/form-data voi file field `avatar` hoac `file`.\n\n" +
            "Logic xu ly:\n" +
            "- Doc userId tu JWT access token.\n" +
            "- Neu co file avatar, backend validate MIME type va gioi han file 10MB, sau do upload file va gan URL moi vao avatar.\n" +
            "- Khong cho cap nhat cac protected fields nhu role, accountCode, tokenVersion, refreshToken, isBanned, isActive, isPremium, id, createdAt, updatedAt, lastActiveAt.\n" +
            "- Neu email/password duoc gui kem payload noi bo thi service van check trung email/hash password, nhung API profile khong document cac field nay cho client.\n" +
            "- Sau khi update, response tra ve profile moi kem startDate/startDateAt neu user co couple ACTIVE."
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
                },
                file: {
                    type: "string",
                    format: "binary",
                    description: "Alias avatar image file field for mobile clients"
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
    @ApiConflictResponse({
        description: "Email already exists if an email change is submitted"
    })
    @ApiNotFoundResponse({
        description: "User not found"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateProfile(
        @Req() req,
        @Body() updateUserDto: UpdateUserDto,
        @UploadedFiles() files?: UploadedAvatarFiles
    ) {
        const payload = await this.withUploadedAvatar(updateUserDto, files, req);
        const user = await this.usersService.updateProfile(this.getCurrentUserId(req), payload);
        return toApiUser(user);
    }

    @Patch("location")
    @ApiOperation({
        summary: "Cap nhat vi tri hien tai cua user",
        description:
            "API nay cap nhat live location cua user dang dang nhap va co the ghi them location history.\n\n" +
            "Body bat buoc:\n" +
            "- lat: latitude tu -90 den 90.\n" +
            "- lng: longitude tu -180 den 180.\n\n" +
            "Body tuy chon:\n" +
            "- accuracy: do chinh xac GPS tinh bang met, 0-5000.\n" +
            "- batteryLevel: phan tram pin, 0-100.\n" +
            "- isCharging: thiet bi dang sac hay khong.\n" +
            "- speed: toc do km/h, 0-200.\n" +
            "- timestamp: thoi diem event tren client theo epoch milliseconds UTC. Khi test thu cong co the bo qua de backend dung server time.\n\n" +
            "Logic xu ly:\n" +
            "- Lam tron lat/lng den 7 chu so thap phan, accuracy den 1 chu so, batteryLevel ve so nguyen 0-100.\n" +
            "- Neu timestamp cu hon hoac bang lastActiveAt da luu thi tra 400.\n" +
            "- Chan spam update qua nhanh: toi thieu 3 giay giua cac lan update va chan som truoc khi doc/ghi DB.\n" +
            "- Chan location jump vo ly neu toc do suy ra vuot 300 km/h.\n" +
            "- Cap nhat bang users voi lat/lng, lastActiveAt va telemetry neu co.\n" +
            "- Neu user dang trong couple ACTIVE, backend emit socket location updated cho room couple.\n" +
            "- Ghi them location_history khi user co couple ACTIVE va vi tri cach record gan nhat toi thieu 10m hoac cach thoi gian toi thieu 30 giay.\n" +
            "- Response tra ve vi tri da duoc backend chap nhan."
    })
    @ApiBody({ type: UpdateUserLocationDto })
    @ApiOkResponse({
        description: "Location updated",
        type: UpdateUserLocationResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid lat/lng, timestamp cu, location qua gan, hoac jump vi tri vo ly"
    })
    @ApiTooManyRequestsResponse({
        description: "Location update qua nhanh, can doi toi thieu 3 giay truoc khi gui lai"
    })
    @ApiNotFoundResponse({
        description: "User not found"
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

    @Get("location-history")
    @ApiOperation({
        summary: "Lay lich su vi tri cua minh hoac partner",
        description:
            "API nay lay danh sach location_history trong couple hien tai.\n\n" +
            "Query params:\n" +
            "- date: ngay dang YYYY-MM-DD. Neu co `date`, backend bo qua `from` va `to`.\n" +
            "- tzOffset: offset timezone tinh bang phut dung kem `date`, vi du 420 cho UTC+7.\n" +
            "- from/to: epoch milliseconds UTC cho khoang thoi gian tuy chinh.\n" +
            "- userId: user can xem history. Neu khong gui thi lay history cua chinh minh. Neu gui partner thi partner bat buoc phai nam trong cung couple ACTIVE.\n" +
            "- limit: so record toi da, mac dinh 3000, toi da 5000.\n" +
            "- offset: vi tri bat dau phan trang, mac dinh 0.\n\n" +
            "Logic xu ly:\n" +
            "- Mac dinh lay toi da 30 ngay gan nhat.\n" +
            "- Neu `date` duoc gui, backend tinh range 00:00-24:00 theo tzOffset roi clamp trong 30 ngay gan nhat.\n" +
            "- Neu `from/to` vuot qua 30 ngay, backend tu cat range ve toi da 30 ngay va khong cho `to` vuot qua thoi diem hien tai.\n" +
            "- Neu user hien tai chua co couple ACTIVE thi tra ve mang rong.\n" +
            "- Neu target userId khong phai minh va khong nam trong couple ACTIVE cua minh thi tra 400.\n" +
            "- Ket qua sap xep tang dan theo recordedAt."
    })
    @ApiQuery({
        name: "date",
        required: false,
        description: "Date (YYYY-MM-DD). If provided, ignores from/to.",
        example: "2026-06-12"
    })
    @ApiQuery({
        name: "tzOffset",
        required: false,
        description: "Timezone offset in minutes for date param (e.g. 420 for UTC+7).",
        example: 420
    })
    @ApiQuery({
        name: "from",
        required: false,
        type: Number,
        description: "Epoch milliseconds (UTC) for range start.",
        example: 1762677600000
    })
    @ApiQuery({
        name: "to",
        required: false,
        type: Number,
        description: "Epoch milliseconds (UTC) for range end.",
        example: 1762764000000
    })
    @ApiQuery({
        name: "userId",
        required: false,
        description: "Target user id (must be in same couple).",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Max records (default 3000, max 5000).",
        example: 3000
    })
    @ApiQuery({
        name: "offset",
        required: false,
        type: Number,
        description: "Offset for pagination (default 0).",
        example: 0
    })
    @ApiOkResponse({
        description: "Location history list",
        type: LocationHistoryResponseDto,
        isArray: true
    })
    @ApiBadRequestResponse({
        description: "Invalid query, invalid date/tzOffset/from/to, hoac target user khong nam trong couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getLocationHistory(
        @Req() req,
        @Query("date") date?: string,
        @Query("tzOffset") tzOffset?: string,
        @Query("from") from?: string,
        @Query("to") to?: string,
        @Query("userId") userId?: string,
        @Query("limit") limit?: string,
        @Query("offset") offset?: string
    ) {
        const requesterId = this.getCurrentUserId(req);
        const { fromDate, toDate } = this.normalizeLocationHistoryRange({ date, tzOffset, from, to });
        const safeLimit = this.normalizeLimit(limit);
        const safeOffset = this.normalizeOffset(offset);

        const items = await this.usersService.getLocationHistory(requesterId, {
            targetUserId: userId?.trim() || undefined,
            from: fromDate,
            to: toDate,
            limit: safeLimit,
            offset: safeOffset
        });

        return items.map((item) => ({
            id: item.id,
            userId: item.userId,
            coupleId: item.coupleId,
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
            accuracy: item.accuracy ?? null,
            speed: item.speed ?? null,
            heading: item.heading ?? null,
            recordedAt: item.recordedAt instanceof Date ? item.recordedAt.toISOString() : new Date(item.recordedAt).toISOString(),
            source: item.source
        }));
    }

    @Delete()
    @ApiOperation({
        summary: "Xoa tai khoan user dang dang nhap",
        description:
            "API nay xoa vinh vien account cua user hien tai va cac du lieu lien quan.\n\n" +
            "Logic xu ly:\n" +
            "- Doc userId tu JWT access token.\n" +
            "- Neu user khong ton tai thi tra 404.\n" +
            "- Chay trong database transaction de xoa dong bo.\n" +
            "- Tim tat ca couple ma user la user1 hoac user2.\n" +
            "- Neu co couple lien quan, backend xoa message, event, moment, location, media, trip theo coupleId roi xoa couple.\n" +
            "- Sau do xoa tiep cac du lieu rieng cua user: message senderId, event creatorId, moment creatorId, location sharedBy, media uploaderId, trip userId, invite inviterId, notification, setting, security setting.\n" +
            "- Cuoi cung xoa row user va tra message thanh cong.\n" +
            "- API nay khong co undo."
    })
    @ApiOkResponse({
        description: "User deleted",
        type: DeleteUserResponseDto
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    @ApiNotFoundResponse({
        description: "User not found"
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

    private async withUploadedAvatar(
        updateUserDto: UpdateUserDto,
        files: UploadedAvatarFiles | undefined,
        req: { protocol?: string; headers?: Record<string, string | string[] | undefined> }
    ) {
        const avatarFile = files?.avatar?.[0] ?? files?.file?.[0];
        if (!avatarFile) {
            return updateUserDto;
        }

        const uploaded = await this.uploadsService.uploadFile(avatarFile, {
            requestBaseUrl: this.uploadsService.resolveRequestBaseUrl(req)
        });
        return {
            ...updateUserDto,
            avatar: uploaded.fileUrl
        };
    }

    private normalizeLimit(value?: string) {
        if (!value) return 3000;
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return 3000;
        return Math.min(Math.floor(parsed), 5000);
    }

    private normalizeOffset(value?: string) {
        if (!value) return 0;
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) return 0;
        return Math.floor(parsed);
    }

    private normalizeLocationHistoryRange(params: {
        date?: string;
        tzOffset?: string;
        from?: string;
        to?: string;
    }) {
        const now = new Date();
        const maxRangeMs = 30 * 24 * 60 * 60 * 1000;
        const minAllowed = new Date(now.getTime() - maxRangeMs);

        let fromDate: Date;
        let toDate: Date;

        if (params.date) {
            const base = this.parseDateOnly(params.date);
            if (!base) {
                throw new BadRequestException("Invalid date");
            }
            const offsetMinutes = this.parseOffsetMinutes(params.tzOffset);
            const offsetMs = offsetMinutes * 60_000;
            fromDate = new Date(base.getTime() - offsetMs);
            toDate = new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
            if (toDate.getTime() <= minAllowed.getTime()) {
                return { fromDate: toDate, toDate };
            }
        } else {
            const fromMs = this.parseEpochMillis(params.from);
            const toMs = this.parseEpochMillis(params.to);
            toDate = typeof toMs === "number" ? new Date(toMs) : now;
            fromDate = typeof fromMs === "number" ? new Date(fromMs) : new Date(toDate.getTime() - maxRangeMs);
        }

        if (toDate.getTime() > now.getTime()) {
            toDate = now;
        }
        if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
            fromDate = new Date(toDate.getTime() - maxRangeMs);
        }
        if (fromDate.getTime() < minAllowed.getTime()) {
            fromDate = minAllowed;
        }

        return { fromDate, toDate };
    }

    private parseEpochMillis(value?: string) {
        if (!value) return undefined;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            throw new BadRequestException("Invalid epoch milliseconds");
        }
        return parsed;
    }

    private parseOffsetMinutes(value?: string) {
        if (!value) return 0;
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            throw new BadRequestException("Invalid tzOffset");
        }
        return Math.trunc(parsed);
    }

    private parseDateOnly(value: string) {
        const trimmed = value.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
        const [year, month, day] = trimmed.split("-").map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (Number.isNaN(date.getTime())) return null;
        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            return null;
        }
        return date;
    }
}
