import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { LocationHistory } from "../../domain/entities/location-history.entity";

@Injectable()
export class LocationHistoryRepository extends Repository<LocationHistory> {
    constructor(private readonly dataSource: DataSource) {
        super(LocationHistory, dataSource.createEntityManager());
    }
}

