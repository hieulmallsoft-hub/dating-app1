import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { SecuritySetting } from "../../domain/entities/security.entity";

@Injectable()
export class SecurityRepository extends Repository<SecuritySetting> {
    constructor(private dataSource: DataSource) {
        super(SecuritySetting, dataSource.createEntityManager());
    }
}
