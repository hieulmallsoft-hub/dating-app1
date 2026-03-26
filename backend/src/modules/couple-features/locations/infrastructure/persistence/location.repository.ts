import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { Location } from "../../domain/entities/location.entity";

@Injectable()
export class LocationRepository extends Repository<Location> {
    constructor(private dataSource: DataSource) {
        super(Location, dataSource.createEntityManager());
    }
}
