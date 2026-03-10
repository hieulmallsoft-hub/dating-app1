import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    Query
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { CoupleService } from "../application/couple.service";
import {
    CoupleLocationHistoryResponseDto,
    CoupleLocationsResponseDto,
    CoupleResponseDto,
    InviteResponseDto,
    JoinCoupleDto,
    UpdateCoupleDto
} from "./dto/couple-ops.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";

@ApiTags("couple")
@ApiBearerAuth("JWT-auth")
@Controller("couple")
@UseGuards(JwtAuthGuard)
export class CoupleController {
    constructor(private readonly coupleService: CoupleService) {}

    @Get()
    @ApiOperation({
        summary: "L?y thông tin c?p dôi hi?n t?i",
        description: "Tr? v? d? li?u c?p dôi và thông tin d?i phuong c?a ngu?i dùng hi?n t?i."
    })
    @ApiOkResponse({
        description: "Ðã tr? v? thông tin c?p dôi",
        type: CoupleResponseDto
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getCouple(@Req() req) {
        return this.coupleService.getMyCoupleWithPartner(this.getCurrentUserId(req));
    }

    @Get("locations")
    @ApiOperation({
        summary: "L?y v? trí live c?a c?p dôi",
        description: "Tr? v? v? trí m?i nh?t c?a tôi và d?i phuong."
    })
    @ApiOkResponse({
        description: "Ðã tr? v? c?p v? trí",
        type: CoupleLocationsResponseDto
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getCoupleLocations(@Req() req) {
        return this.coupleService.getCoupleLocations(this.getCurrentUserId(req));
    }

    @Get("location-history")
    @ApiOperation({
        summary: "L?y l?ch s? v? trí c?p dôi",
        description: "Tr? v? l?ch s? v? trí c?a c? hai ngu?i dùng. limit s? du?c gi?i h?n b?i service."
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Gi?i h?n s? di?m l?ch s?",
        example: 120
    })
    @ApiOkResponse({
        description: "Ðã tr? v? l?ch s? v? trí",
        type: CoupleLocationHistoryResponseDto
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getCoupleLocationHistory(@Req() req, @Query("limit") limit?: string) {
        const parsedLimit = limit ? Number(limit) : undefined;
        return this.coupleService.getCoupleLocationHistory(this.getCurrentUserId(req), parsedLimit);
    }

    @Post("invite")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "T?o mã m?i",
        description: "T?o mã m?i dang ch? cho ngu?i dùng hi?n t?i."
    })
    @ApiOkResponse({
        description: "Ðã t?o mã m?i",
        type: InviteResponseDto
    })
    @ApiConflictResponse({
        description: "Ngu?i dùng hi?n t?i dã có c?p dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async createInvite(@Req() req) {
        return this.coupleService.createInvite(this.getCurrentUserId(req));
    }

    @Post("join")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Ghép dôi b?ng mã m?i",
        description: "Dùng mã m?i h?p l? d? t?o quan h? c?p dôi."
    })
    @ApiOkResponse({
        description: "Ghép dôi thành công",
        type: CoupleResponseDto
    })
    @ApiBadRequestResponse({
        description: "Mã m?i sai d?nh d?ng, dã h?t h?n ho?c dã du?c s? d?ng"
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y mã m?i"
    })
    @ApiConflictResponse({
        description: "Ngu?i dùng hi?n t?i dã có c?p dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async joinCouple(@Req() req, @Body() joinCoupleDto: JoinCoupleDto) {
        return this.coupleService.joinCouple(this.getCurrentUserId(req), joinCoupleDto.inviteCode);
    }

    @Post("disconnect")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Ng?t k?t n?i c?p dôi hi?n t?i",
        description: "Ng?t quan h? c?p dôi hi?n t?i."
    })
    @ApiOkResponse({
        description: "Ðã ng?t k?t n?i",
        type: CoupleResponseDto
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async disconnect(@Req() req) {
        return this.coupleService.disconnect(this.getCurrentUserId(req));
    }

    @Post("connect-new")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "K?t n?i c?p dôi m?i b?ng mã m?i",
        description: "Ng?t c?p dôi cu (n?u có) r?i k?t n?i v?i mã m?i m?i."
    })
    @ApiOkResponse({
        description: "Ðã k?t n?i v?i c?p dôi m?i",
        type: CoupleResponseDto
    })
    @ApiBadRequestResponse({
        description: "Mã m?i không h?p l?/dã h?t h?n/dã s? d?ng"
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y mã m?i"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async connectNew(@Req() req, @Body() joinCoupleDto: JoinCoupleDto) {
        return this.coupleService.connectNew(this.getCurrentUserId(req), joinCoupleDto.inviteCode);
    }

    @Put("start-date")
    @ApiOperation({
        summary: "C?p nh?t ngày b?t d?u yêu nhau",
        description: "Thi?t l?p ngày b?t d?u m?i quan h?."
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t ngày b?t d?u",
        type: CoupleResponseDto
    })
    @ApiBadRequestResponse({
        description: "Sai d?nh d?ng ngày"
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async setStartDate(@Req() req, @Body() updateCoupleDto: UpdateCoupleDto) {
        return this.coupleService.updateCouple(this.getCurrentUserId(req), { startDate: updateCoupleDto.startDate });
    }

    @Put("theme")
    @ApiOperation({
        summary: "C?p nh?t giao di?n c?p dôi",
        description: "Thi?t l?p giao di?n hi?n t?i c?a c?p dôi."
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t giao di?n",
        type: CoupleResponseDto
    })
    @ApiNotFoundResponse({
        description: "Ngu?i dùng hi?n t?i chua ghép dôi"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async setTheme(@Req() req, @Body() updateCoupleDto: UpdateCoupleDto) {
        return this.coupleService.updateCouple(this.getCurrentUserId(req), { theme: updateCoupleDto.theme });
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }
}




