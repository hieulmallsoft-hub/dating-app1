import { Controller, Get, Post, Body, Req, UseGuards, Query } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { PlacesService } from "../application/places.service";
import { CreatePlaceDto } from "./dto/place-ops.dto";
import { JwtAuthGuard } from "../../../common-user/auth/infrastructure/strategies/jwt-auth-guard";

@ApiBearerAuth("JWT-auth")
@Controller("places")
@UseGuards(JwtAuthGuard)
export class PlacesController {
    constructor(private readonly placesService: PlacesService) {}

    @Get()
    async getPlaces(@Req() req) {
        return this.placesService.getPlaces(req.user.sub);
    }

    @Post()
    async createPlace(@Req() req, @Body() dto: CreatePlaceDto) {
        return this.placesService.createPlace(req.user.sub, dto);
    }

    @Get("search")
    async searchPlaces(@Query("q") query: string) {
        return this.placesService.searchPlaces(query);
    }
}



