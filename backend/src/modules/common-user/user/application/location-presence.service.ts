import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../../common/redis/redis.service";

export type PresenceStatus = "online" | "disconnected";

type PresenceRecord = {
    status: PresenceStatus;
    lastSeenAt: number;
    coupleId?: string | null;
};

@Injectable()
export class LocationPresenceService {
    private readonly ttlMs = 60_000;
    private readonly records = new Map<string, PresenceRecord>();

    constructor(private readonly redisService: RedisService) {}

    markOnline(userId: string, coupleId?: string | null) {
        const now = Date.now();
        const record: PresenceRecord = {
            status: "online",
            lastSeenAt: now,
            coupleId: coupleId ?? this.records.get(userId)?.coupleId ?? null
        };
        this.persist(userId, record);
        return record;
    }

    async touch(userId: string) {
        const now = Date.now();
        const existing = await this.getRecord(userId);
        const record: PresenceRecord = {
            status: "online",
            lastSeenAt: now,
            coupleId: existing?.coupleId ?? null
        };
        this.persist(userId, record);
        return record;
    }

    async markDisconnected(userId: string) {
        const existing = await this.getRecord(userId);
        if (!existing) return null;
        const record: PresenceRecord = {
            status: "disconnected",
            lastSeenAt: existing.lastSeenAt,
            coupleId: existing.coupleId ?? null
        };
        this.persist(userId, record);
        return record;
    }

    async isOnline(userId: string) {
        const record = await this.getRecord(userId);
        if (!record) return false;
        if (Date.now() - record.lastSeenAt > this.ttlMs) return false;
        return record.status === "online";
    }

    async getCoupleId(userId: string) {
        const record = await this.getRecord(userId);
        return record?.coupleId ?? null;
    }

    async setCoupleId(userId: string, coupleId: string) {
        const existing = await this.getRecord(userId);
        this.persist(userId, {
            status: existing?.status ?? "online",
            lastSeenAt: existing?.lastSeenAt ?? Date.now(),
            coupleId
        });
    }

    sweepExpired() {
        const now = Date.now();
        const expired: Array<{ userId: string; record: PresenceRecord }> = [];
        for (const [userId, record] of this.records) {
            if (record.status === "online" && now - record.lastSeenAt > this.ttlMs) {
                const next: PresenceRecord = {
                    status: "disconnected",
                    lastSeenAt: record.lastSeenAt,
                    coupleId: record.coupleId ?? null
                };
                this.records.set(userId, next);
                expired.push({ userId, record: next });
            }
        }
        return expired;
    }

    private async getRecord(userId: string): Promise<PresenceRecord | null> {
        const client = this.redisService.getClient();
        if (client) {
            const raw = await client.get(this.key(userId));
            if (!raw) return null;
            try {
                const parsed = JSON.parse(raw) as PresenceRecord;
                if (!parsed || typeof parsed.lastSeenAt !== "number") return null;
                return parsed;
            } catch {
                return null;
            }
        }
        return this.records.get(userId) ?? null;
    }

    private persist(userId: string, record: PresenceRecord) {
        const client = this.redisService.getClient();
        if (client) {
            client.set(this.key(userId), JSON.stringify(record), "PX", this.ttlMs * 2).catch(() => null);
            return;
        }
        this.records.set(userId, record);
    }

    private key(userId: string) {
        return `presence:user:${userId}`;
    }
}
