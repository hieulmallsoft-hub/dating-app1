import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { MomentRepository } from "../infrastructure/persistence/moment.repository";
import { CoupleService } from "../../couple/application/couple.service";
import { CreateMomentDto, UpdateMomentDto } from "../presentation/dto/moment-ops.dto";
import { Moment } from "../domain/entities/moment.entity";

import { MomentsService as MomentsServiceType } from "./moments.service";
import { MediaService } from "../../media/application/media.service";

@Injectable()
export class MomentsService {
    constructor(
        private readonly momentRepository: MomentRepository,
        private readonly coupleService: CoupleService,
        private readonly mediaService: MediaService
    ) {}

    async createMoment(userId: string, dto: CreateMomentDto) {
        const couple = await this.coupleService.getMyCouple(userId);

        const moment = this.momentRepository.create({
            ...dto,
            coupleId: couple.id,
            creatorId: userId
        });

        const savedMoment = await this.momentRepository.save(moment);

        // Sync photos to media album
        if (dto.photos && dto.photos.length > 0) {
            for (const photoUrl of dto.photos) {
                await this.mediaService.addMedia(userId, couple.id, photoUrl);
            }
        }

        return savedMoment;
    }

    async getFeed(userId: string) {
        const couple = await this.coupleService.getMyCouple(userId);

        return this.momentRepository.find({
            where: { coupleId: couple.id },
            order: { createdAt: "DESC" },
            relations: ["creator"]
        });
    }

    async updateMoment(userId: string, id: string, dto: UpdateMomentDto) {
        const moment = await this.momentRepository.findOne({ where: { id } });
        if (!moment) throw new NotFoundException("Moment not found");
        if (moment.creatorId !== userId) throw new ForbiddenException("Not your moment");

        Object.assign(moment, dto);
        return this.momentRepository.save(moment);
    }

    async deleteMoment(userId: string, id: string) {
        const moment = await this.momentRepository.findOne({ where: { id } });
        if (!moment) throw new NotFoundException("Moment not found");
        if (moment.creatorId !== userId) throw new ForbiddenException("Not your moment");

        await this.momentRepository.delete(id);
        return { success: true };
    }
}
