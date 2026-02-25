import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Moment } from '../../domain/entities/moment.entity';

@Injectable()
export class MomentRepository extends Repository<Moment> {
  constructor(private dataSource: DataSource) {
    super(Moment, dataSource.createEntityManager());
  }
}
