import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TripRepository } from "../infrastructure/persistence/trip.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { TripSyncDto } from "../presentation/dto/trip.dto";
import { RoutePoint, Trip } from "../domain/entities/trip.entity";

@Injectable()
export class TripsService {
    constructor(
        private readonly tripRepository: TripRepository,
        private readonly coupleService: CoupleService
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
}
