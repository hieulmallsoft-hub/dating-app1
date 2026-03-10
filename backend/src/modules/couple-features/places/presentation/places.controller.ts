import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Req,
    UseGuards,
    Query,
    Param,
    UnauthorizedException
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { PlacesService } from "../application/places.service";
import {
    CreatePlaceDto,
    PlaceResponseDto,
    PlaceSearchResultResponseDto
} from "./dto/place-ops.dto";
import { UpdatePlaceDto } from "./dto/update-place.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";


@ApiTags("places")
@ApiBearerAuth("JWT-auth")
@Controller("places")
@UseGuards(JwtAuthGuard)
export class PlacesController {
    constructor(private readonly placesService: PlacesService) {}

    @Get()
    @ApiOperation({
        summary: "L?y danh sách d?a di?m",
        description: "Tr? v? danh sách d?a di?m c?a c?p dôi hi?n t?i. Tham s? `since` h? tr? d?ng b? tang d?n."
    })
    @ApiQuery({
        name: "since",
        required: false,
        type: Number,
        description: "Epoch milliseconds cho d?ng b? tang d?n",
        example: 1762677600000
    })
    @ApiOkResponse({
        description: "Ðã tr? v? danh sách d?a di?m",
        type: PlaceResponseDto,
        isArray: true
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async getPlaces(@Req() req, @Query("since") since?: string) {
        const parsedSince = since ? Number(since) : undefined;
        return this.placesService.getPlaces(this.getCurrentUserId(req), parsedSince);
    }

    @Post()
    @ApiOperation({
        summary: "T?o d?a di?m",
        description: "T?o d?a di?m cho c?p dôi hi?n t?i."
    })
    @ApiCreatedResponse({
        description: "Ðã t?o d?a di?m",
        type: PlaceResponseDto
    })
    @ApiBadRequestResponse({
        description: "D? li?u không h?p l? (lat/lng/radius/type...)"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async createPlace(@Req() req, @Body() dto: CreatePlaceDto) {
        return this.placesService.createPlace(this.getCurrentUserId(req), dto);
    }

    @Put(":id")
    @ApiOperation({
        summary: "C?p nh?t d?a di?m",
        description: "C?p nh?t d?a di?m theo id."
    })
    @ApiParam({
        name: "id",
        description: "ID d?a di?m",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã c?p nh?t d?a di?m",
        type: PlaceResponseDto
    })
    @ApiBadRequestResponse({
        description: "D? li?u không h?p l?"
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y d?a di?m ho?c d?a di?m không thu?c c?p dôi hi?n t?i"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async updatePlace(@Req() req, @Param("id") id: string, @Body() dto: UpdatePlaceDto) {
        return this.placesService.updatePlace(this.getCurrentUserId(req), id, dto);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Xóa d?a di?m (xóa m?m)",
        description: "Xóa m?m d?a di?m theo id."
    })
    @ApiParam({
        name: "id",
        description: "ID d?a di?m",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Ðã xóa d?a di?m",
        type: PlaceResponseDto
    })
    @ApiNotFoundResponse({
        description: "Không tìm th?y d?a di?m"
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async deletePlace(@Req() req, @Param("id") id: string) {
        return this.placesService.deletePlace(this.getCurrentUserId(req), id);
    }

    @Get("search")
    @ApiOperation({
        summary: "Tìm d?a di?m theo t? khóa",
        description: "Tìm ki?m b?ng nhà cung c?p d?a di?m bên ngoài theo t? khóa."
    })
    @ApiQuery({
        name: "q",
        required: true,
        description: "T? khóa tìm ki?m",
        example: "coffee"
    })
    @ApiOkResponse({
        description: "K?t qu? tìm ki?m. Tr? v? [] khi t? khóa quá ng?n ho?c nhà cung c?p g?p l?i.",
        type: PlaceSearchResultResponseDto,
        isArray: true
    })
    @ApiUnauthorizedResponse({
        description: "Thi?u token truy c?p ho?c token không h?p l?"
    })
    async searchPlaces(@Query("q") query: string) {
        return this.placesService.searchPlaces(query);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }

}




