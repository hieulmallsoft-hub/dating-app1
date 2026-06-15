import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { LessThan } from "typeorm";
import { LocationHistoryRepository } from "../infrastructure/persistence/location-history.repository";

@Injectable()
export class LocationHistoryRetentionService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(LocationHistoryRetentionService.name);
    private readonly retentionDays = 30;
    private readonly cleanupIntervalMs = 24 * 60 * 60 * 1000;
    private cleanupTimer: NodeJS.Timeout | null = null;
    private isCleaning = false;

    constructor(private readonly locationHistoryRepository: LocationHistoryRepository) {}

    onModuleInit() {
        this.cleanupTimer = setInterval(() => {
            void this.cleanupExpiredHistory();
        }, this.cleanupIntervalMs);

        setTimeout(() => {
            void this.cleanupExpiredHistory();
        }, 60_000);
    }

    onModuleDestroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    async cleanupExpiredHistory() {
        if (this.isCleaning) return;
        this.isCleaning = true;

        try {
            const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
            const result = await this.locationHistoryRepository.delete({
                recordedAt: LessThan(cutoff)
            });

            const deleted = result.affected ?? 0;
            if (deleted > 0) {
                this.logger.log(
                    `Deleted ${deleted} location history rows older than ${this.retentionDays} days`
                );
            }
        } catch (error) {
            this.logger.warn(
                `Location history cleanup failed: ${error instanceof Error ? error.message : "unknown"}`
            );
        } finally {
            this.isCleaning = false;
        }
    }
}
