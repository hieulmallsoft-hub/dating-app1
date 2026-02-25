import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Setting } from '../../domain/entities/setting.entity';

@Injectable()
export class SettingRepository extends Repository<Setting> {
  constructor(private dataSource: DataSource) {
    super(Setting, dataSource.createEntityManager());
  }
}
