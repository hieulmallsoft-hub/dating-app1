import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Place } from '../../domain/entities/place.entity';

@Injectable()
export class PlaceRepository extends Repository<Place> {
  constructor(private dataSource: DataSource) {
    super(Place, dataSource.createEntityManager());
  }
}
