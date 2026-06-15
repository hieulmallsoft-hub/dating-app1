import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { SyncRequest } from "../../domain/entities/sync-request.entity";

@Injectable()
export class SyncRequestRepository extends Repository<SyncRequest> {
    constructor(private dataSource: DataSource) {
        super(SyncRequest, dataSource.createEntityManager());
    }
}
