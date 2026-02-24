import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Message } from '../../domain/entities/message.entity';

@Injectable()
export class MessageRepository extends Repository<Message> {
  constructor(private dataSource: DataSource) {
    super(Message, dataSource.createEntityManager());
  }
}
