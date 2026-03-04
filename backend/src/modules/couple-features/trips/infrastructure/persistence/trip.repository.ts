import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Trip } from "../../domain/entities/trip.entity";

@Injectable()
export class TripRepository extends Repository<Trip> {
    constructor(private readonly dataSource: DataSource) {
        super(Trip, dataSource.createEntityManager());
    }
}
