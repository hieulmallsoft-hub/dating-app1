import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis, { type Redis as RedisClient } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: RedisClient | null = null;
    private isConnected = false;

    constructor(private readonly configService: ConfigService) {
        void this.init();
    }

    private async init() {
        const enabled = String(this.configService.get<string>("REDIS_ENABLED") || "").toLowerCase() === "true";
        const url = this.configService.get<string>("REDIS_URL");
        const host = this.configService.get<string>("REDIS_HOST");
        const port = this.configService.get<string>("REDIS_PORT");
        const password = this.configService.get<string>("REDIS_PASSWORD");

        if (!enabled && !url) {
            return;
        }

        try {
            this.client = url
                ? new Redis(url, { lazyConnect: true, retryStrategy: () => null })
                : new Redis({
                      host: host || "127.0.0.1",
                      port: port ? Number(port) : 6379,
                      password: password || undefined,
                      lazyConnect: true,
                      retryStrategy: () => null
                  });

            this.client.on("error", (err) => {
                if (!this.isConnected) return;
                this.logger.warn(`Redis error: ${err?.message || err}`);
            });
            this.client.on("ready", () => {
                this.isConnected = true;
            });

            await this.client.connect();
        } catch (error) {
            if (this.client) {
                await this.client.quit().catch(() => null);
            }
            this.client = null;
            this.isConnected = false;
        }
    }

    getClient() {
        return this.client;
    }

    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
        }
        this.isConnected = false;
    }
}
