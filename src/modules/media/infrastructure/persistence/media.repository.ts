import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Media } from '../../domain/entities/media.entity';

@Injectable()
export class MediaRepository extends Repository<Media> {
  constructor(private dataSource: DataSource) {
    super(Media, dataSource.createEntityManager());
  }
}
