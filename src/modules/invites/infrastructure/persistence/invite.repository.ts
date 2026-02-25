import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Invite } from '../../domain/entities/invite.entity';

@Injectable()
export class InviteRepository extends Repository<Invite> {
  constructor(private dataSource: DataSource) {
    super(Invite, dataSource.createEntityManager());
  }
}
