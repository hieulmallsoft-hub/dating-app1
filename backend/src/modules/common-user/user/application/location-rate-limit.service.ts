import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../../common/redis/redis.service";

type LastUpdate = { lat: number; lng: number; at: number };

@Injectable()
export class LocationRateLimitService {
    private readonly lastUpdates = new Map<string, LastUpdate>();
    private readonly redisTtlSeconds = 600;

    constructor(private readonly redisService: RedisService) {}

    async shouldIgnoreUpdate(
        userId: string,
        lat: number,
        lng: number,
        eventTime: Date,
        distanceMeters: (aLat: number, aLng: number, bLat: number, bLng: number) => number,
        opts: { minIntervalMs: number; minDistanceM: number; maxSpeedKmh: number }
    ) {
        const last = await this.getLast(userId);
        if (!last) return false;

        const elapsed = eventTime.getTime() - last.at;
        if (elapsed <= 0) return true;
        if (elapsed < opts.minIntervalMs) return true;

        const dist = distanceMeters(last.lat, last.lng, lat, lng);
        if (dist < opts.minDistanceM) return true;

        const speedKmh = (dist / 1000) / (elapsed / 3600000);
        if (speedKmh > opts.maxSpeedKmh) return true;

        return false;
    }

    async commit(userId: string, lat: number, lng: number, eventTime: Date) {
        const payload: LastUpdate = { lat, lng, at: eventTime.getTime() };
        const client = this.redisService.getClient();
        if (client) {
            await client.set(this.key(userId), JSON.stringify(payload), "EX", this.redisTtlSeconds);
            return;
        }
        this.lastUpdates.set(userId, payload);
    }

    private async getLast(userId: string) {
        const client = this.redisService.getClient();
        if (client) {
            const raw = await client.get(this.key(userId));
            if (!raw) return null;
            try {
                const parsed = JSON.parse(raw) as LastUpdate;
                if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number" && typeof parsed?.at === "number") {
                    return parsed;
                }
            } catch {
                return null;
            }
            return null;
        }
        return this.lastUpdates.get(userId) ?? null;
    }

    private key(userId: string) {
        return `location:last:${userId}`;
    }
}
