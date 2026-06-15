import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../../common/redis/redis.service";

type MemoryRateRecord = {
    count: number;
    resetAt: number;
};

type SessionRecord = {
    expiresAt: number;
};

@Injectable()
export class WebRtcSignalingStateService {
    private readonly presenceTtlSeconds = 60;
    private readonly sessionTtlMs = 10 * 60 * 1000;
    private readonly maxOpenSessionsPerUser = 5;
    private readonly presence = new Map<string, Map<string, number>>();
    private readonly rates = new Map<string, MemoryRateRecord>();
    private readonly sessions = new Map<string, Map<string, SessionRecord>>();

    constructor(private readonly redisService: RedisService) {}

    getPresenceTtlSeconds() {
        return this.presenceTtlSeconds;
    }

    async markOnline(userId: string, socketId: string) {
        const client = this.redisService.getClient();
        if (client) {
            const key = this.presenceKey(userId);
            await client
                .multi()
                .sadd(key, socketId)
                .expire(key, this.presenceTtlSeconds)
                .set(this.socketKey(socketId), userId, "EX", this.presenceTtlSeconds)
                .exec();
            return;
        }

        this.sweepPresence();
        const sockets = this.presence.get(userId) ?? new Map<string, number>();
        sockets.set(socketId, Date.now() + this.presenceTtlSeconds * 1000);
        this.presence.set(userId, sockets);
    }

    async markOffline(userId: string, socketId: string) {
        const client = this.redisService.getClient();
        if (client) {
            const key = this.presenceKey(userId);
            await client.multi().srem(key, socketId).del(this.socketKey(socketId)).exec();
            const count = await client.scard(key);
            if (count <= 0) {
                await client.del(key);
            }
            return count > 0;
        }

        this.sweepPresence();
        const sockets = this.presence.get(userId);
        if (!sockets) return false;

        sockets.delete(socketId);
        if (sockets.size > 0) return true;

        this.presence.delete(userId);
        return false;
    }

    async isOnline(userId: string) {
        const client = this.redisService.getClient();
        if (client) {
            return (await client.scard(this.presenceKey(userId))) > 0;
        }

        this.sweepPresence();
        return (this.presence.get(userId)?.size ?? 0) > 0;
    }

    async consumeRateLimit(key: string, limit: number, windowSeconds: number) {
        const client = this.redisService.getClient();
        if (client) {
            const redisKey = this.rateKey(key);
            const count = await client.incr(redisKey);
            if (count === 1) {
                await client.expire(redisKey, windowSeconds);
            }
            return count <= limit;
        }

        const now = Date.now();
        const resetAt = now + windowSeconds * 1000;
        const existing = this.rates.get(key);
        if (!existing || existing.resetAt <= now) {
            this.rates.set(key, { count: 1, resetAt });
            return true;
        }

        existing.count += 1;
        return existing.count <= limit;
    }

    async openSession(userId: string, sessionId: string) {
        const now = Date.now();
        const expiresAt = now + this.sessionTtlMs;
        const client = this.redisService.getClient();

        if (client) {
            const key = this.sessionsKey(userId);
            await client.zremrangebyscore(key, "-inf", now);
            const exists = await client.zscore(key, sessionId);
            if (exists) {
                await client.zadd(key, expiresAt, sessionId);
                await client.pexpire(key, this.sessionTtlMs);
                return true;
            }

            const count = await client.zcard(key);
            if (count >= this.maxOpenSessionsPerUser) {
                return false;
            }

            await client.zadd(key, expiresAt, sessionId);
            await client.pexpire(key, this.sessionTtlMs);
            return true;
        }

        this.sweepSessions();
        const sessions = this.sessions.get(userId) ?? new Map<string, SessionRecord>();
        if (!sessions.has(sessionId) && sessions.size >= this.maxOpenSessionsPerUser) {
            return false;
        }

        sessions.set(sessionId, { expiresAt });
        this.sessions.set(userId, sessions);
        return true;
    }

    async closeSession(userId: string, sessionId: string) {
        const client = this.redisService.getClient();
        if (client) {
            await client.zrem(this.sessionsKey(userId), sessionId);
            return;
        }

        const sessions = this.sessions.get(userId);
        if (!sessions) return;

        sessions.delete(sessionId);
        if (sessions.size === 0) {
            this.sessions.delete(userId);
        }
    }

    private sweepPresence() {
        const now = Date.now();
        for (const [userId, sockets] of this.presence) {
            for (const [socketId, expiresAt] of sockets) {
                if (expiresAt <= now) {
                    sockets.delete(socketId);
                }
            }
            if (sockets.size === 0) {
                this.presence.delete(userId);
            }
        }
    }

    private sweepSessions() {
        const now = Date.now();
        for (const [userId, sessions] of this.sessions) {
            for (const [sessionId, session] of sessions) {
                if (session.expiresAt <= now) {
                    sessions.delete(sessionId);
                }
            }
            if (sessions.size === 0) {
                this.sessions.delete(userId);
            }
        }
    }

    private presenceKey(userId: string) {
        return `webrtc:presence:${userId}`;
    }

    private socketKey(socketId: string) {
        return `webrtc:socket:${socketId}`;
    }

    private rateKey(key: string) {
        return `webrtc:rate:${key}`;
    }

    private sessionsKey(userId: string) {
        return `webrtc:sessions:${userId}`;
    }
}
