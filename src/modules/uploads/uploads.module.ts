import { Module } from "@nestjs/common";

import { UploadsService } from "./application/uploads.service";
import { UploadsController } from "./presentation/uploads.controller";

@Module({
    providers: [UploadsService],
    controllers: [UploadsController],
    exports: [UploadsService]
})
export class UploadsModule {}
