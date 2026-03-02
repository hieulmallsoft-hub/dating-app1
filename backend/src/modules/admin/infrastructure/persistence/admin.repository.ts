import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { Admin } from "../../domain/entities/admin.entity";
// file này dùng để viết các query phưc tạp dùng truy xuất dữ liệu
@Injectable()
export class AdminRepository extends Repository<Admin> {
    constructor(private dataSource: DataSource) {
        super(Admin, dataSource.createEntityManager());
    }
}
