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
        summary: "Get place list",
        description: "Returns place list of current couple. `since` supports incremental sync."
    })
    @ApiQuery({
        name: "since",
        required: false,
        type: Number,
        description: "Epoch milliseconds for incremental sync",
        example: 1762677600000
    })
    @ApiOkResponse({
        description: "Returns place list",
        type: PlaceResponseDto,
        isArray: true
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getPlaces(@Req() req, @Query("since") since?: string) {
        const parsedSince = since ? Number(since) : undefined;
        return this.placesService.getPlaces(this.getCurrentUserId(req), parsedSince);
    }

    @Post()
    @ApiOperation({
        summary: "Create place",
        description: "Create place for current couple."
    })
    @ApiCreatedResponse({
        description: "Place created",
        type: PlaceResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload (lat/lng/radius/type...)"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createPlace(@Req() req, @Body() dto: CreatePlaceDto) {
        return this.placesService.createPlace(this.getCurrentUserId(req), dto);
    }

    @Put(":id")
    @ApiOperation({
        summary: "Update place",
        description: "Update place by id."
    })
    @ApiParam({
        name: "id",
        description: "Place ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Place updated",
        type: PlaceResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload"
    })
    @ApiNotFoundResponse({
        description: "Place not found or does not belong to current couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updatePlace(@Req() req, @Param("id") id: string, @Body() dto: UpdatePlaceDto) {
        return this.placesService.updatePlace(this.getCurrentUserId(req), id, dto);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Soft delete place",
        description: "Soft delete place by id."
    })
    @ApiParam({
        name: "id",
        description: "Place ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Place deleted",
        type: PlaceResponseDto
    })
    @ApiNotFoundResponse({
        description: "Place not found"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async deletePlace(@Req() req, @Param("id") id: string) {
        return this.placesService.deletePlace(this.getCurrentUserId(req), id);
    }

    @Get("search")
    @ApiOperation({
        summary: "Search places by keyword",
        description: "Search external place providers by keyword."
    })
    @ApiQuery({
        name: "q",
        required: true,
        description: "Search keyword",
        example: "coffee"
    })
    @ApiOkResponse({
        description: "Search result. Returns [] when keyword is too short or provider errors.",
        type: PlaceSearchResultResponseDto,
        isArray: true
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
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




