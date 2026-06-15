import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { CoupleService } from "./couple.service";

@Injectable()
export class DisconnectedCoupleRetentionService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DisconnectedCoupleRetentionService.name);
    private readonly cleanupIntervalMs = 24 * 60 * 60 * 1000;
    private cleanupTimer: NodeJS.Timeout | null = null;
    private isCleaning = false;

    constructor(private readonly coupleService: CoupleService) {}

    onModuleInit() {
        this.cleanupTimer = setInterval(() => {
            void this.cleanupExpiredCouples();
        }, this.cleanupIntervalMs);

        setTimeout(() => {
            void this.cleanupExpiredCouples();
        }, 60_000);
    }

    onModuleDestroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    async cleanupExpiredCouples() {
        if (this.isCleaning) return;
        this.isCleaning = true;

        try {
            const deleted = await this.coupleService.cleanupExpiredDisconnectedCouples();
            if (deleted > 0) {
                this.logger.log(`Deleted ${deleted} disconnected couples older than 30 days`);
            }
        } catch (error) {
            this.logger.warn(
                `Disconnected couple cleanup failed: ${error instanceof Error ? error.message : "unknown"}`
            );
        } finally {
            this.isCleaning = false;
        }
    }
}
