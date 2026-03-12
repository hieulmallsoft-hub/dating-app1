import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { PushToken } from "../../domain/entities/push-token.entity";

@Injectable()
export class PushTokenRepository extends Repository<PushToken> {
    constructor(private readonly dataSource: DataSource) {
        super(PushToken, dataSource.createEntityManager());
    }
}
