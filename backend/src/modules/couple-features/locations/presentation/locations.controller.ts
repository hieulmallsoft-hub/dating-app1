import {
    Controller,
    Get,
    Post,
    Patch,
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
import { LocationsService } from "../application/locations.service";
import {
    CreateLocationDto,
    LocationResponseDto,
    LocationSearchResultResponseDto
} from "./dto/location-ops.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";
import { toLocationResponse, toLocationResponseList } from "./mappers/location-response.mapper";


@ApiTags("locations")
@ApiBearerAuth("JWT-auth")
@Controller("locations")
@UseGuards(JwtAuthGuard)
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) {}

    @Get()
    @ApiOperation({
        summary: "Get location list",
        description: "Returns location list of current couple. `since` supports incremental sync."
    })
    @ApiQuery({
        name: "since",
        required: false,
        type: Number,
        description: "Epoch milliseconds for incremental sync",
        example: 1762677600000
    })
    @ApiOkResponse({
        description: "Returns location list",
        type: LocationResponseDto,
        isArray: true
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async getLocations(@Req() req, @Query("since") since?: string) {
        const parsedSince = since ? Number(since) : undefined;
        const locations = await this.locationsService.getLocations(this.getCurrentUserId(req), parsedSince);
        return toLocationResponseList(locations);
    }

    @Post()
    @ApiOperation({
        summary: "Create location",
        description: "Create saved location for current couple."
    })
    @ApiCreatedResponse({
        description: "Location created",
        type: LocationResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload (lat/lng/radius/type...)"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async createLocation(@Req() req, @Body() dto: CreateLocationDto) {
        const location = await this.locationsService.createLocation(this.getCurrentUserId(req), dto);
        return toLocationResponse(location);
    }

    @Patch(":id")
    @ApiOperation({
        summary: "Update location",
        description: "Update location by id."
    })
    @ApiParam({
        name: "id",
        description: "Location ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Location updated",
        type: LocationResponseDto
    })
    @ApiBadRequestResponse({
        description: "Invalid payload"
    })
    @ApiNotFoundResponse({
        description: "Location not found or does not belong to current couple"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async updateLocation(@Req() req, @Param("id") id: string, @Body() dto: UpdateLocationDto) {
        const location = await this.locationsService.updateLocation(this.getCurrentUserId(req), id, dto);
        return toLocationResponse(location);
    }

    @Delete(":id")
    @ApiOperation({
        summary: "Soft delete location",
        description: "Soft delete location by id."
    })
    @ApiParam({
        name: "id",
        description: "Location ID",
        example: "7ad1fd3e-30ec-4cca-bfb9-9b8cb857ccf8"
    })
    @ApiOkResponse({
        description: "Location deleted",
        type: LocationResponseDto
    })
    @ApiNotFoundResponse({
        description: "Location not found"
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async deleteLocation(@Req() req, @Param("id") id: string) {
        const location = await this.locationsService.deleteLocation(this.getCurrentUserId(req), id);
        return toLocationResponse(location);
    }

    @Get("search")
    @ApiOperation({
        summary: "Search locations by keyword",
        description: "Search external location providers by keyword."
    })
    @ApiQuery({
        name: "q",
        required: true,
        description: "Search keyword",
        example: "coffee"
    })
    @ApiOkResponse({
        description: "Search result. Returns [] when keyword is too short or provider errors.",
        type: LocationSearchResultResponseDto,
        isArray: true
    })
    @ApiUnauthorizedResponse({
        description: "Missing/invalid access token"
    })
    async searchLocations(@Query("q") query: string) {
        return this.locationsService.searchLocations(query);
    }

    private getCurrentUserId(req: { user?: { sub?: string; id?: string; user_Id?: string } }) {
        const userId = req.user?.sub || req.user?.id || req.user?.user_Id;
        if (!userId) {
            throw new UnauthorizedException("Invalid access token payload");
        }
        return userId;
    }

}




