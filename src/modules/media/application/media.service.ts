import { Injectable, NotFoundException } from '@nestjs/common';
import { MediaRepository } from '../infrastructure/persistence/media.repository';
import { CoupleService } from '../../couple/application/couple.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly coupleService: CoupleService,
  ) {}

  async getAlbum(userId: string, filter: 'all' | 'me' | 'partner') {
    const couple = await this.coupleService.getMyCouple(userId);
    const partnerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;

    const query = this.mediaRepository.createQueryBuilder('media')
      .where('media.coupleId = :coupleId', { coupleId: couple.id });

    if (filter === 'me') {
      query.andWhere('media.uploaderId = :userId', { userId });
    } else if (filter === 'partner') {
      query.andWhere('media.uploaderId = :partnerId', { partnerId });
    }

    return query.orderBy('media.createdAt', 'DESC').getMany();
  }

  async addMedia(userId: string, coupleId: string, url: string, type: string = 'image') {
    const media = this.mediaRepository.create({
      uploaderId: userId,
      coupleId,
      url,
      type,
    });
    return this.mediaRepository.save(media);
  }
}
