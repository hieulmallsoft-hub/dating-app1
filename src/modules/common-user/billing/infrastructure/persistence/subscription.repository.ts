import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Subscription } from "../../domain/entities/subscription.entity";

@Injectable()
export class SubscriptionRepository extends Repository<Subscription> {
    constructor(private readonly dataSource: DataSource) {
        super(Subscription, dataSource.createEntityManager());
    }
}
