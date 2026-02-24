import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './domain/entities/event.entity';
import { EventsService } from './application/events.service';
import { EventRepository } from './infrastructure/persistence/event.repository';
import { EventsController } from './presentation/events.controller';
import { CoupleModule } from '../couple/couple.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event]),
    CoupleModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, EventRepository],
  exports: [EventsService],
})
export class EventsModule {}
