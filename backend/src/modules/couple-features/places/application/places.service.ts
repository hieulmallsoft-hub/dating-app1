import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { FindOptionsWhere, MoreThanOrEqual } from "typeorm";
import { PlaceRepository } from "../infrastructure/persistence/place.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { CreatePlaceDto } from "../presentation/dto/place-ops.dto";
import { UpdatePlaceDto } from "../presentation/dto/update-place.dto";
import { Place, PlaceType } from "../domain/entities/place.entity";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { UsersService } from "../../../common-user/user/application/user.service";

@Injectable()
export class PlacesService {
    private readonly logger = new Logger(PlacesService.name);

    constructor(
        private readonly placeRepository: PlaceRepository,
        private readonly coupleService: CoupleService,
        private readonly notificationsService: NotificationsService,
        private readonly usersService: UsersService
    ) {}

    async createPlace(userId: string, dto: CreatePlaceDto) {
        const couple = await this.coupleService.getMyCouple(userId);

        const place = this.placeRepository.create({
            name: dto.name,
            address: dto.address ?? null,
            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            radius: dto.radius ?? 200,
            iconResName: dto.iconResName ?? null,
            placeType: dto.placeType ?? PlaceType.OTHER,
            isSynced: dto.isSynced ?? true,
            isDeleted: dto.isDeleted ?? false,
            coupleId: couple.id,
            sharedBy: userId
        });

        return this.placeRepository.save(place);
    }

    async getPlaces(userId: string, since?: number) {
        const couple = await this.coupleService.getMyCouple(userId);
        const where: FindOptionsWhere<Place> & { updatedAt?: any } = { coupleId: couple.id };

        if (typeof since === "number" && Number.isFinite(since)) {
            where.updatedAt = MoreThanOrEqual(new Date(since));
        } else {
            where.isDeleted = false;
        }

        return this.placeRepository.find({
            where,
            order: { createdAt: "DESC" }
        });
    }

    async updatePlace(userId: string, placeId: string, dto: UpdatePlaceDto) {
        const couple = await this.coupleService.getMyCouple(userId);
        const place = await this.placeRepository.findOne({
            where: { id: placeId, coupleId: couple.id }
        });

        if (!place) {
            throw new NotFoundException("Place not found");
        }

        if (dto.name !== undefined) place.name = dto.name;
        if (dto.address !== undefined) place.address = dto.address;
        if (dto.latitude !== undefined) place.latitude = dto.latitude;
        if (dto.longitude !== undefined) place.longitude = dto.longitude;
        if (dto.radius !== undefined) place.radius = dto.radius;
        if (dto.iconResName !== undefined) place.iconResName = dto.iconResName;
        if (dto.placeType !== undefined) place.placeType = dto.placeType;
        if (dto.isDeleted !== undefined) place.isDeleted = dto.isDeleted;
        if (dto.isSynced !== undefined) place.isSynced = dto.isSynced;

        return this.placeRepository.save(place);
    }

    async deletePlace(userId: string, placeId: string) {
        const couple = await this.coupleService.getMyCouple(userId);
        const place = await this.placeRepository.findOne({
            where: { id: placeId, coupleId: couple.id }
        });

        if (!place) {
            throw new NotFoundException("Place not found");
        }

        place.isDeleted = true;
        place.isSynced = true;
        return this.placeRepository.save(place);
    }

    async handleGeofenceEvent(
        userId: string,
        payload: { placeId: string; transition: "ENTER" | "EXIT"; timestamp?: number }
    ) {
        const couple = await this.coupleService.getMyCouple(userId);
        const place = await this.placeRepository.findOne({
            where: { id: payload.placeId, coupleId: couple.id, isDeleted: false }
        });

        if (!place) {
            throw new NotFoundException("Place not found");
        }

        const partnerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;
        if (!partnerId) {
            throw new BadRequestException("Partner not connected");
        }

        const me = await this.usersService.getUserById(userId);
        const actorName = me.fullName || "Your partner";
        const verb = payload.transition === "ENTER" ? "arrived at" : "left";
        const title = payload.transition === "ENTER" ? "Geofence enter" : "Geofence exit";
        const content = `${actorName} ${verb} ${place.name}`;

        await this.notificationsService.createNotification(partnerId, title, content, "geofence");

        return {
            success: true,
            placeId: place.id,
            transition: payload.transition,
            timestamp: payload.timestamp ?? Date.now()
        };
    }

    async searchPlaces(query: string) {
        const trimmedQuery = (query || "").trim();
        if (trimmedQuery.length < 2) {
            return [];
        }

        try {
            const endpoint = new URL("https://nominatim.openstreetmap.org/search");
            endpoint.searchParams.set("q", trimmedQuery);
            endpoint.searchParams.set("format", "jsonv2");
            endpoint.searchParams.set("addressdetails", "1");
            endpoint.searchParams.set("limit", "10");
            endpoint.searchParams.set("accept-language", "vi,en");

            const response = await fetch(endpoint.toString(), {
                headers: {
                    "User-Agent": "dating-app/1.0 (location-search)",
                    Referer: "https://localhost"
                }
            });

            if (!response.ok) {
                this.logger.warn(`Nominatim search failed: ${response.status} ${response.statusText}`);
                return [];
            }

            const payload = (await response.json()) as Array<{
                place_id?: string | number;
                display_name?: string;
                name?: string;
                lat?: string;
                lon?: string;
                type?: string;
                class?: string;
            }>;

            return payload.map((item) => {
                const latitude = item.lat ? Number(item.lat) : null;
                const longitude = item.lon ? Number(item.lon) : null;
                const type = this.detectPlaceType(item.type, item.class, item.name || item.display_name || "");

                return {
                    id: String(item.place_id ?? `${item.lat}-${item.lon}-${item.name || item.display_name || ""}`),
                    name: item.name || this.extractPrimaryName(item.display_name) || trimmedQuery,
                    address: item.display_name || null,
                    latitude: Number.isFinite(latitude as number) ? latitude : null,
                    longitude: Number.isFinite(longitude as number) ? longitude : null,
                    placeType: type,
                    type: type
                };
            });
        } catch (error) {
            this.logger.warn(
                `Search places failed for query "${trimmedQuery}": ${(error as Error)?.message || "unknown"}`
            );
            return [];
        }
    }

    private extractPrimaryName(displayName?: string) {
        if (!displayName) return "";
        return displayName.split(",")[0].trim();
    }

    private detectPlaceType(rawType?: string, rawClass?: string, rawName = ""): PlaceType {
        const normalizedType = `${rawType || ""} ${rawClass || ""} ${rawName}`.toLowerCase();
        if (normalizedType.includes("home") || normalizedType.includes("residential")) {
            return PlaceType.HOME;
        }
        if (
            normalizedType.includes("school") ||
            normalizedType.includes("college") ||
            normalizedType.includes("university")
        ) {
            return PlaceType.SCHOOL;
        }
        if (
            normalizedType.includes("company") ||
            normalizedType.includes("office") ||
            normalizedType.includes("work")
        ) {
            return PlaceType.COMPANY;
        }
        if (
            normalizedType.includes("restaurant") ||
            normalizedType.includes("food") ||
            normalizedType.includes("fast_food")
        ) {
            return PlaceType.RESTAURANT;
        }
        if (
            normalizedType.includes("cafe") ||
            normalizedType.includes("coffee") ||
            normalizedType.includes("tea")
        ) {
            return PlaceType.CAFE;
        }
        if (
            normalizedType.includes("park") ||
            normalizedType.includes("garden") ||
            normalizedType.includes("playground")
        ) {
            return PlaceType.PARK;
        }
        if (
            normalizedType.includes("museum") ||
            normalizedType.includes("gallery") ||
            normalizedType.includes("exhibit")
        ) {
            return PlaceType.MUSEUM;
        }
        return PlaceType.OTHER;
    }
}
