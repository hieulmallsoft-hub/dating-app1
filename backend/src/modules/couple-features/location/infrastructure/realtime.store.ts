import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type RedisClient = {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, mode: string, ttl: number) => Promise<unknown>;
    del: (key: string) => Promise<number>;
};

type MemoryEntry = {
    value: string;
    expiresAt: number | null;
};

@Injectable()
export class RealtimeStore {
    private readonly logger = new Logger(RealtimeStore.name);
    private readonly memory = new Map<string, MemoryEntry>();
    private redis: RedisClient | null = null;

    constructor(private readonly configService: ConfigService) {
        this.initRedis();
    }

    private initRedis() {
        const url = this.configService.get<string>("REDIS_URL");
        const host = this.configService.get<string>("REDIS_HOST");
        if (!url && !host) {
            return;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const Redis = require("ioredis");
            const port = Number(this.configService.get<string>("REDIS_PORT") || 6379);
            const password = this.configService.get<string>("REDIS_PASSWORD") || undefined;

            this.redis = url
                ? new Redis(url)
                : new Redis({ host, port, password });
            this.logger.log("Redis connected for realtime store");
        } catch (error: unknown) {
            this.redis = null;
            this.logger.warn(
                `Redis unavailable, falling back to in-memory store: ${
                    error instanceof Error ? error.message : "unknown"
                }`
            );
        }
    }

    async get(key: string): Promise<string | null> {
        if (this.redis) {
            return this.redis.get(key);
        }

        const entry = this.memory.get(key);
        if (!entry) {
            return null;
        }
        if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
            this.memory.delete(key);
            return null;
        }
        return entry.value;
    }

    async set(key: string, value: string, ttlSeconds: number) {
        if (this.redis) {
            await this.redis.set(key, value, "EX", ttlSeconds);
            return;
        }
        const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
        this.memory.set(key, { value, expiresAt });
    }

    async del(key: string) {
        if (this.redis) {
            await this.redis.del(key);
            return;
        }
        this.memory.delete(key);
    }
}
