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
import { ApiBearerAuth } from "@nestjs/swagger";
import { PlacesService } from "../application/places.service";
import { CreatePlaceDto } from "./dto/place-ops.dto";
import { UpdatePlaceDto } from "./dto/update-place.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";


@ApiBearerAuth("JWT-auth")
@Controller("places")
@UseGuards(JwtAuthGuard)
export class PlacesController {
    constructor(private readonly placesService: PlacesService) {}

    @Get()
    async getPlaces(@Req() req, @Query("since") since?: string) {
        const parsedSince = since ? Number(since) : undefined;
        return this.placesService.getPlaces(this.getCurrentUserId(req), parsedSince);
    }

    @Post()
    async createPlace(@Req() req, @Body() dto: CreatePlaceDto) {
        return this.placesService.createPlace(this.getCurrentUserId(req), dto);
    }

    @Put(":id")
    async updatePlace(@Req() req, @Param("id") id: string, @Body() dto: UpdatePlaceDto) {
        return this.placesService.updatePlace(this.getCurrentUserId(req), id, dto);
    }

    @Delete(":id")
    async deletePlace(@Req() req, @Param("id") id: string) {
        return this.placesService.deletePlace(this.getCurrentUserId(req), id);
    }

    @Get("search")
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



