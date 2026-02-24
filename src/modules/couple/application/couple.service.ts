import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CoupleRepository } from '../infrastructure/persistence/couple.repository';
import { InviteService } from '../../invites/application/invite.service';
import { Couple, CoupleStatus } from '../domain/entities/couple.entity';

@Injectable()
export class CoupleService {
  constructor(
    private readonly coupleRepository: CoupleRepository,
    private readonly inviteService: InviteService,
  ) {}

  async getMyCouple(userId: string): Promise<Couple> {
    const couple = await this.coupleRepository.findOne({
      where: [
        { user1Id: userId, status: CoupleStatus.ACTIVE },
        { user2Id: userId, status: CoupleStatus.ACTIVE },
      ],
      relations: ['user1', 'user2'],
    });

    if (!couple) {
      throw new NotFoundException('You are not in a couple');
    }

    return couple;
  }

  async createInvite(userId: string) {
    // Check if already in a couple
    const existing = await this.coupleRepository.findOne({
      where: [
        { user1Id: userId, status: CoupleStatus.ACTIVE },
        { user2Id: userId, status: CoupleStatus.ACTIVE },
      ],
    });

    if (existing && existing.user2Id) {
      throw new ConflictException('You are already in a couple');
    }

    return this.inviteService.createInvite(userId);
  }

  async joinCouple(userId: string, inviteCode: string) {
    const invite = await this.inviteService.validateInvite(inviteCode);

    if (invite.inviterId === userId) {
      throw new BadRequestException('You cannot join your own invite');
    }

    // Check if current user is already in a couple
    const amIInCouple = await this.coupleRepository.findOne({
      where: [
        { user1Id: userId, status: CoupleStatus.ACTIVE },
        { user2Id: userId, status: CoupleStatus.ACTIVE },
      ],
    });

    if (amIInCouple) {
      throw new ConflictException('You are already in a couple');
    }

    // Create or Update couple
    const couple = this.coupleRepository.create({
      user1Id: invite.inviterId,
      user2Id: userId,
      status: CoupleStatus.ACTIVE,
    });

    await this.coupleRepository.save(couple);
    await this.inviteService.markAsUsed(invite.id);

    return couple;
  }

  async disconnect(userId: string) {
    const couple = await this.getMyCouple(userId);
    couple.status = CoupleStatus.DISCONNECTED;
    return this.coupleRepository.save(couple);
  }

  async updateCouple(userId: string, dto: any) {
    const couple = await this.getMyCouple(userId);
    if (dto.startDate) couple.startDate = new Date(dto.startDate);
    if (dto.theme) couple.theme = dto.theme;
    return this.coupleRepository.save(couple);
  }
}
