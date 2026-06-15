import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Subscription } from "./domain/entities/subscription.entity";
import { BillingService } from "./application/billing.service";
import { SubscriptionRepository } from "./infrastructure/persistence/subscription.repository";
import { BillingController } from "./presentation/billing.controller";
import { UserModule } from "../user/user.module";

@Module({
    imports: [TypeOrmModule.forFeature([Subscription]), UserModule],
    controllers: [BillingController],
    providers: [BillingService, SubscriptionRepository],
    exports: [BillingService]
})
export class BillingModule {}
