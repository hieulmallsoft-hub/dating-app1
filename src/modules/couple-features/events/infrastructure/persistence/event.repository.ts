import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { Event } from "../../domain/entities/event.entity";

@Injectable()
export class EventRepository extends Repository<Event> {
    constructor(private dataSource: DataSource) {
        super(Event, dataSource.createEntityManager());
    }
}
