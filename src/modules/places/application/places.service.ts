import { Injectable } from '@nestjs/common';
import { PlaceRepository } from '../infrastructure/persistence/place.repository';
import { CoupleService } from '../../couple/application/couple.service';
import { CreatePlaceDto } from '../presentation/dto/place-ops.dto';

@Injectable()
export class PlacesService {
  constructor(
    private readonly placeRepository: PlaceRepository,
    private readonly coupleService: CoupleService,
  ) {}

  async createPlace(userId: string, dto: CreatePlaceDto) {
    const couple = await this.coupleService.getMyCouple(userId);
    
    const place = this.placeRepository.create({
      ...dto,
      coupleId: couple.id,
      sharedBy: userId,
    });

    return this.placeRepository.save(place);
  }

  async getPlaces(userId: string) {
    const couple = await this.coupleService.getMyCouple(userId);
    return this.placeRepository.find({
      where: { coupleId: couple.id },
      order: { createdAt: 'DESC' },
      relations: ['sharedByUser'],
    });
  }

  async searchPlaces(query: string) {
    // Mock search logic
    return [
      { id: '1', name: `Mock Restaurant for ${query}`, address: '123 Sweet St', type: 'restaurant' },
      { id: '2', name: `Mock Cafe for ${query}`, address: '456 Love Ave', type: 'cafe' },
    ];
  }
}
