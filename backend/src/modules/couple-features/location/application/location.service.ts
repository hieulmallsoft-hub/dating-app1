import { Injectable, NotFoundException } from "@nestjs/common";
import { CoupleService } from "../../couple/application/couple.service";
import { UsersService } from "../../../common-user/user/application/user.service";
import { RealtimeStore } from "../infrastructure/realtime.store";
import { HeartbeatDto, PresenceStatus, UpdateRealtimeLocationDto } from "../presentation/dto/location.dto";

type LocationSnapshot = {
    lat: number;
    lng: number;
    bat: number | null;
    chg: boolean | null;
    spd: number | null;
    acc: number | null;
    ts: number;
};

type StatusSnapshot = {
    status: PresenceStatus;
    ts: number;
    bat: number | null;
    chg: boolean | null;
    spd: number | null;
};

@Injectable()
export class LocationService {
    private readonly locationTtlSeconds = 30 * 60;
    private readonly statusTtlSeconds = 5 * 60;

    constructor(
        private readonly coupleService: CoupleService,
        private readonly usersService: UsersService,
        private readonly store: RealtimeStore
    ) {}

    async updateLocation(userId: string, dto: UpdateRealtimeLocationDto) {
        const timestamp = typeof dto.timestamp === "number" ? dto.timestamp : Date.now();
        const snapshot: LocationSnapshot = {
            lat: dto.lat,
            lng: dto.lng,
            bat: typeof dto.batteryLevel === "number" ? Math.round(dto.batteryLevel) : null,
            chg: typeof dto.isCharging === "boolean" ? dto.isCharging : null,
            spd: typeof dto.speed === "number" ? dto.speed : null,
            acc: typeof dto.accuracy === "number" ? dto.accuracy : null,
            ts: timestamp
        };

        await this.store.set(this.locationKey(userId), JSON.stringify(snapshot), this.locationTtlSeconds);
        await this.usersService.updateMyLocation(
            userId,
            dto.lat,
            dto.lng,
            dto.accuracy,
            dto.batteryLevel,
            dto.isCharging,
            dto.speed
        );

        await this.setStatus(userId, PresenceStatus.ONLINE, dto);
        return snapshot;
    }

    async getPartnerLocation(userId: string) {
        const couple = await this.coupleService.getMyCouple(userId);
        const partnerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;

        if (!partnerId) {
            throw new NotFoundException("Partner not connected");
        }

        const [partner, location, status] = await Promise.all([
            this.usersService.getUserById(partnerId),
            this.getLocationSnapshot(partnerId),
            this.getStatusSnapshot(partnerId)
        ]);

        const lastUpdated = location?.ts ?? (partner.lastActiveAt ? partner.lastActiveAt.getTime() : null);
        const derivedStatus =
            status?.status ??
            (lastUpdated !== null && Date.now() - lastUpdated <= 30 * 60 * 1000
                ? PresenceStatus.BACKGROUND
                : PresenceStatus.OFFLINE);

        return {
            partner: {
                userId: partner.id,
                lat: location?.lat ?? partner.latitude ?? null,
                lng: location?.lng ?? partner.longitude ?? null,
                batteryLevel: location?.bat ?? partner.batteryLevel ?? null,
                isCharging: location?.chg ?? partner.isCharging ?? null,
                speed: location?.spd ?? partner.speed ?? null,
                lastUpdated
            },
            status: derivedStatus,
            statusTimestamp: status?.ts ?? lastUpdated
        };
    }

    async heartbeat(userId: string, dto: HeartbeatDto) {
        await this.setStatus(userId, dto.status ?? PresenceStatus.ONLINE, dto);
        const status = await this.getStatusSnapshot(userId);
        return {
            userId,
            status: status?.status ?? PresenceStatus.ONLINE,
            timestamp: status?.ts ?? Date.now()
        };
    }

    async setStatus(userId: string, status: PresenceStatus, dto?: HeartbeatDto) {
        const snapshot: StatusSnapshot = {
            status,
            ts: Date.now(),
            bat: typeof dto?.batteryLevel === "number" ? Math.round(dto.batteryLevel) : null,
            chg: typeof dto?.isCharging === "boolean" ? dto.isCharging : null,
            spd: typeof dto?.speed === "number" ? dto.speed : null
        };

        await this.store.set(this.statusKey(userId), JSON.stringify(snapshot), this.statusTtlSeconds);
    }

    async getLocationSnapshot(userId: string): Promise<LocationSnapshot | null> {
        const raw = await this.store.get(this.locationKey(userId));
        if (!raw) return null;
        try {
            return JSON.parse(raw) as LocationSnapshot;
        } catch {
            return null;
        }
    }

    async getStatusSnapshot(userId: string): Promise<StatusSnapshot | null> {
        const raw = await this.store.get(this.statusKey(userId));
        if (!raw) return null;
        try {
            return JSON.parse(raw) as StatusSnapshot;
        } catch {
            return null;
        }
    }

    private locationKey(userId: string) {
        return `loc:${userId}`;
    }

    private statusKey(userId: string) {
        return `status:${userId}`;
    }
}
