import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { Couple } from "../../domain/entities/couple.entity";

@Injectable()
export class CoupleRepository extends Repository<Couple> {
    constructor(private dataSource: DataSource) {
        super(Couple, dataSource.createEntityManager());
    }
}
