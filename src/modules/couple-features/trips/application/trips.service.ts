import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
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

    async listTrips(
        userId: string,
        targetUserId: string,
        page = 1,
        limit = 20,
        fromInput?: string,
        toInput?: string
    ) {
        const couple = await this.coupleService.getMyCouple(userId);
        this.assertPartnerAccess(couple.id, targetUserId, couple.user1Id, couple.user2Id);
        const { from, to } = this.normalizeTripRange(fromInput, toInput);

        const safeLimit = Number.isFinite(limit) ? Math.floor(limit) : 20;
        const safePageInput = Number.isFinite(page) ? Math.floor(page) : 1;
        const take = Math.max(1, Math.min(100, safeLimit));
        const safePage = Math.max(1, safePageInput);
        const skip = (safePage - 1) * take;
        const where: FindOptionsWhere<Trip> & { startTime?: any } = {
            coupleId: couple.id,
            userId: targetUserId
        };

        if (from && to) {
            where.startTime = Between(from, to);
        } else if (from) {
            where.startTime = MoreThanOrEqual(from);
        } else if (to) {
            where.startTime = LessThanOrEqual(to);
        }

        const [data, total] = await this.tripRepository.findAndCount({
            where,
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

            const startTime = new Date(item.startTime);
            const endTime = new Date(item.endTime);
            if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
                throw new BadRequestException("Trip startTime/endTime is invalid");
            }
            if (endTime.getTime() < startTime.getTime()) {
                throw new BadRequestException("Trip endTime must be greater than or equal to startTime");
            }
            if (typeof item.distanceKm !== "number" || !Number.isFinite(item.distanceKm) || item.distanceKm < 0) {
                throw new BadRequestException("Trip distanceKm must be a non-negative number");
            }

            const routeFull = item.routePoints.map((p) => ({ lat: p.lat, lng: p.lng }));
            const routePreview = this.sampleRoute(routeFull, 120);

            return this.tripRepository.create({
                id: item.id,
                userId,
                coupleId: couple.id,
                startTime,
                endTime,
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

    private normalizeTripRange(fromInput?: string, toInput?: string) {
        const from = this.toOptionalEpochDate(fromInput, "from");
        const to = this.toOptionalEpochDate(toInput, "to");

        if (!from && !to) {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return { from: thirtyDaysAgo, to: now };
        }

        if (from && to && from.getTime() > to.getTime()) {
            throw new BadRequestException("from must be less than or equal to to");
        }

        return { from, to };
    }

    private toOptionalEpochDate(raw: string | undefined, field: "from" | "to") {
        if (raw === undefined || raw === null || String(raw).trim().length === 0) {
            return null;
        }

        const parsedNumber = Number(raw);
        if (!Number.isFinite(parsedNumber) || parsedNumber < 0) {
            throw new BadRequestException(`${field} must be a valid epoch milliseconds number`);
        }

        const parsedDate = new Date(parsedNumber);
        if (Number.isNaN(parsedDate.getTime())) {
            throw new BadRequestException(`${field} is invalid`);
        }

        return parsedDate;
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
