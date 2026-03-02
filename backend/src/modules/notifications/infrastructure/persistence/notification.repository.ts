import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { Notification } from "../../domain/entities/notification.entity";

@Injectable()
export class NotificationRepository extends Repository<Notification> {
    constructor(private dataSource: DataSource) {
        super(Notification, dataSource.createEntityManager());
    }
}
