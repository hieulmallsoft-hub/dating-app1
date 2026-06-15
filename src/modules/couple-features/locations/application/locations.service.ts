import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { FindOptionsWhere, MoreThanOrEqual } from "typeorm";
import { LocationRepository } from "../infrastructure/persistence/location.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { CreateLocationDto } from "../presentation/dto/location-ops.dto";
import { UpdateLocationDto } from "../presentation/dto/update-location.dto";
import { Location, LocationType } from "../domain/entities/location.entity";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { UsersService } from "../../../common-user/user/application/user.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";
import { LocationsGateway } from "../presentation/locations.gateway";
import { toLocationResponse } from "../presentation/mappers/location-response.mapper";

@Injectable()
export class LocationsService {
    private readonly logger = new Logger(LocationsService.name);

    constructor(
        private readonly locationRepository: LocationRepository,
        private readonly coupleService: CoupleService,
        private readonly notificationsService: NotificationsService,
        private readonly usersService: UsersService,
        private readonly locationsGateway: LocationsGateway
    ) {}

    async createLocation(userId: string, dto: CreateLocationDto) {
        const couple = await this.coupleService.getMyCouple(userId);

        const location = this.locationRepository.create({
            name: dto.name,
            address: dto.address ?? null,
            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            radius: dto.radius ?? 200,
            iconResName: dto.iconResName ?? null,
            locationType: dto.locationType ?? LocationType.OTHER,
            isSynced: dto.isSynced ?? true,
            isDeleted: dto.isDeleted ?? false,
            coupleId: couple.id,
            sharedBy: userId
        });

        const saved = await this.locationRepository.save(location);
        this.locationsGateway.emitToCouple(couple.id, "locations:created", toLocationResponse(saved));
        if (!saved.isDeleted) {
            await this.notifyPartnerForLocation(couple, userId, "created", saved);
        }
        return saved;
    }

    async getLocations(userId: string, since?: number) {
        const couple = await this.coupleService.getMyCouple(userId);
        const where: FindOptionsWhere<Location> & { updatedAt?: any } = { coupleId: couple.id };

        if (typeof since === "number" && Number.isFinite(since)) {
            where.updatedAt = MoreThanOrEqual(new Date(since));
        } else {
            where.isDeleted = false;
        }

        return this.locationRepository.find({
            where,
            order: { createdAt: "DESC" }
        });
    }

    async updateLocation(userId: string, locationId: string, dto: UpdateLocationDto) {
        const couple = await this.coupleService.getMyCouple(userId);
        const location = await this.locationRepository.findOne({
            where: { id: locationId, coupleId: couple.id }
        });

        if (!location) {
            throw new NotFoundException("Location not found");
        }

        const wasDeleted = location.isDeleted;

        if (dto.name !== undefined) location.name = dto.name;
        if (dto.address !== undefined) location.address = dto.address;
        if (dto.latitude !== undefined) location.latitude = dto.latitude;
        if (dto.longitude !== undefined) location.longitude = dto.longitude;
        if (dto.radius !== undefined) location.radius = dto.radius;
        if (dto.iconResName !== undefined) location.iconResName = dto.iconResName;
        if (dto.locationType !== undefined) location.locationType = dto.locationType;
        if (dto.isDeleted !== undefined) location.isDeleted = dto.isDeleted;
        if (dto.isSynced !== undefined) location.isSynced = dto.isSynced;

        const saved = await this.locationRepository.save(location);
        this.locationsGateway.emitToCouple(couple.id, "locations:updated", toLocationResponse(saved));
        if (!wasDeleted) {
            await this.notifyPartnerForLocation(couple, userId, saved.isDeleted ? "deleted" : "updated", saved);
        }
        return saved;
    }

    async deleteLocation(userId: string, locationId: string) {
        const couple = await this.coupleService.getMyCouple(userId);
        const location = await this.locationRepository.findOne({
            where: { id: locationId, coupleId: couple.id }
        });

        if (!location) {
            throw new NotFoundException("Location not found");
        }

        location.isDeleted = true;
        location.isSynced = true;
        const saved = await this.locationRepository.save(location);
        this.locationsGateway.emitToCouple(couple.id, "locations:deleted", toLocationResponse(saved));
        await this.notifyPartnerForLocation(couple, userId, "deleted", saved);
        return saved;
    }

    async handleGeofenceEvent(
        userId: string,
        payload: { locationId: string; transition: "ENTER" | "EXIT"; timestamp?: number }
    ) {
        const couple = await this.coupleService.getMyCouple(userId);
        const location = await this.locationRepository.findOne({
            where: { id: payload.locationId, coupleId: couple.id, isDeleted: false }
        });

        if (!location) {
            throw new NotFoundException("Location not found");
        }

        const partnerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;
        if (!partnerId) {
            throw new BadRequestException("Partner not connected");
        }

        const me = await this.usersService.getUserById(userId);
        const actorName = me.fullName || "Your partner";
        const verb = payload.transition === "ENTER" ? "arrived at" : "left";
        const title = payload.transition === "ENTER" ? "Geofence enter" : "Geofence exit";
        const content = `${actorName} ${verb} ${location.name}`;

        await this.notificationsService.createNotification(
            partnerId,
            title,
            content,
            NotificationType.GEOFENCE
        );

        return {
            success: true,
            locationId: location.id,
            transition: payload.transition,
            timestamp: payload.timestamp ?? Date.now()
        };
    }

    async searchLocations(query: string) {
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
                const type = this.detectLocationType(item.type, item.class, item.name || item.display_name || "");

                return {
                    id: String(item.place_id ?? `${item.lat}-${item.lon}-${item.name || item.display_name || ""}`),
                    name: item.name || this.extractPrimaryName(item.display_name) || trimmedQuery,
                    address: item.display_name || null,
                    latitude: Number.isFinite(latitude as number) ? latitude : null,
                    longitude: Number.isFinite(longitude as number) ? longitude : null,
                    locationType: type,
                    type: type
                };
            });
        } catch (error) {
            this.logger.warn(
                `Search locations failed for query "${trimmedQuery}": ${(error as Error)?.message || "unknown"}`
            );
            return [];
        }
    }

    private extractPrimaryName(displayName?: string) {
        if (!displayName) return "";
        return displayName.split(",")[0].trim();
    }

    private async notifyPartnerForLocation(
        couple: { id?: string; user1Id: string; user2Id: string | null },
        actorId: string,
        action: "created" | "updated" | "deleted",
        location: { id: string; name?: string | null; address?: string | null }
    ) {
        const partnerId = couple.user1Id === actorId ? couple.user2Id : couple.user1Id;
        if (!partnerId) return;

        const locationName = location.name?.trim() || location.address?.trim() || "dia diem";

        let title = "Dia diem moi";

        if (action === "updated") {
            title = "Dia diem da cap nhat";
        } else if (action === "deleted") {
            title = "Dia diem da xoa";
        }

        try {
            await this.notificationsService.createNotification(
                partnerId,
                title,
                locationName,
                this.resolveLocationNotificationType(action),
                {
                    action,
                    locationId: location.id
                }
            );
        } catch (error) {
            this.logger.warn(`Create location notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }

    private resolveLocationNotificationType(action: "created" | "updated" | "deleted") {
        if (action === "updated") return NotificationType.LOCATION_UPDATED;
        if (action === "deleted") return NotificationType.LOCATION_DELETED;
        return NotificationType.LOCATION_CREATED;
    }

    private detectLocationType(rawType?: string, rawClass?: string, rawName = ""): LocationType {
        const normalizedType = `${rawType || ""} ${rawClass || ""} ${rawName}`.toLowerCase();
        if (normalizedType.includes("home") || normalizedType.includes("residential")) {
            return LocationType.HOME;
        }
        if (
            normalizedType.includes("school") ||
            normalizedType.includes("college") ||
            normalizedType.includes("university")
        ) {
            return LocationType.SCHOOL;
        }
        if (
            normalizedType.includes("company") ||
            normalizedType.includes("office") ||
            normalizedType.includes("work")
        ) {
            return LocationType.COMPANY;
        }
        if (
            normalizedType.includes("mall") ||
            normalizedType.includes("shopping") ||
            normalizedType.includes("retail")
        ) {
            return LocationType.MALL;
        }
        if (
            normalizedType.includes("cafe") ||
            normalizedType.includes("coffee") ||
            normalizedType.includes("tea") ||
            normalizedType.includes("restaurant") ||
            normalizedType.includes("food") ||
            normalizedType.includes("fast_food")
        ) {
            return LocationType.CAFE;
        }
        if (
            normalizedType.includes("park") ||
            normalizedType.includes("garden") ||
            normalizedType.includes("playground")
        ) {
            return LocationType.PARK;
        }
        if (
            normalizedType.includes("gym") ||
            normalizedType.includes("fitness") ||
            normalizedType.includes("sport") ||
            normalizedType.includes("workout")
        ) {
            return LocationType.GYM;
        }
        return LocationType.OTHER;
    }
}
