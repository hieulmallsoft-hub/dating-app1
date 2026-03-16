import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { TripRepository } from "../infrastructure/persistence/trip.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { TripSyncDto } from "../presentation/dto/trip.dto";
import { RoutePoint, Trip } from "../domain/entities/trip.entity";
import { NotificationsService } from "../../../common-user/notifications/application/notifications.service";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";

@Injectable()
export class TripsService {
    private readonly logger = new Logger(TripsService.name);

    constructor(
        private readonly tripRepository: TripRepository,
        private readonly coupleService: CoupleService,
        private readonly notificationsService: NotificationsService
    ) {}

    async listTrips(userId: string, targetUserId: string, page = 1, limit = 20) {
        const couple = await this.coupleService.getMyCouple(userId);
        this.assertPartnerAccess(couple.id, targetUserId, couple.user1Id, couple.user2Id);

        const take = Math.max(1, Math.min(100, Math.floor(limit)));
        const safePage = Math.max(1, Math.floor(page));
        const skip = (safePage - 1) * take;

        const [data, total] = await this.tripRepository.findAndCount({
            where: { coupleId: couple.id, userId: targetUserId },
            order: { startTime: "DESC" },
            skip,
            take
        });

        return {
            data,
            page: safePage,
            limit: take,
            total
        };
    }

    async getTripDetail(userId: string, tripId: string) {
        const couple = await this.coupleService.getMyCouple(userId);
        const trip = await this.tripRepository
            .createQueryBuilder("trip")
            .addSelect("trip.routeFull")
            .where("trip.id = :id", { id: tripId })
            .getOne();

        if (!trip) {
            throw new NotFoundException("Trip not found");
        }

        this.assertPartnerAccess(couple.id, trip.userId, couple.user1Id, couple.user2Id);
        if (trip.coupleId !== couple.id) {
            throw new NotFoundException("Trip not found");
        }

        return trip;
    }

    async syncTrips(userId: string, dto: TripSyncDto) {
        const couple = await this.coupleService.getMyCouple(userId);

        const payload = dto.trips.map((item) => {
            if (!item.routePoints || item.routePoints.length === 0) {
                throw new BadRequestException("Trip routePoints is required");
            }

            const routeFull = item.routePoints.map((p) => ({ lat: p.lat, lng: p.lng }));
            const routePreview = this.sampleRoute(routeFull, 120);

            return this.tripRepository.create({
                id: item.id,
                userId,
                coupleId: couple.id,
                startTime: new Date(item.startTime),
                endTime: new Date(item.endTime),
                distanceKm: item.distanceKm,
                startAddress: item.startAddress ?? null,
                endAddress: item.endAddress ?? null,
                routePreview,
                routeFull
            });
        });

        const saved = await this.tripRepository.save(payload);
        await this.notifyPartnerForTripSync(couple, userId, saved.length);
        return {
            success: true,
            count: saved.length
        };
    }

    private sampleRoute(points: RoutePoint[], maxPoints: number) {
        if (points.length <= maxPoints) {
            return points;
        }
        const step = Math.ceil(points.length / maxPoints);
        const sampled: RoutePoint[] = [];
        for (let index = 0; index < points.length; index += step) {
            sampled.push(points[index]);
        }
        if (sampled[sampled.length - 1] !== points[points.length - 1]) {
            sampled.push(points[points.length - 1]);
        }
        return sampled;
    }

    private assertPartnerAccess(coupleId: string, targetUserId: string, user1Id: string, user2Id: string | null) {
        if (targetUserId !== user1Id && targetUserId !== user2Id) {
            throw new NotFoundException("Trip not found");
        }
        if (!coupleId) {
            throw new NotFoundException("Trip not found");
        }
    }

    private async notifyPartnerForTripSync(
        couple: { user1Id: string; user2Id: string | null },
        actorId: string,
        syncedCount: number
    ) {
        const partnerId = couple.user1Id === actorId ? couple.user2Id : couple.user1Id;
        if (!partnerId || syncedCount <= 0) return;

        const title = "Lo trinh moi";
        const content =
            syncedCount > 1
                ? `Doi cua ban vua dong bo ${syncedCount} chuyen di moi`
                : "Doi cua ban vua dong bo 1 chuyen di moi";

        try {
            await this.notificationsService.createNotificationWithTimeWindow(
                partnerId,
                title,
                content,
                NotificationType.TRIP,
                600
            );
        } catch (error) {
            this.logger.warn(`Create trip notification failed: ${(error as Error)?.message || "unknown"}`);
        }
    }
}
