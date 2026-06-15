import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from "typeorm";

export enum BillingProvider {
    GOOGLE_PLAY = "GOOGLE_PLAY"
}

export enum SubscriptionStatus {
    ACTIVE = "ACTIVE",
    PENDING = "PENDING",
    CANCELED = "CANCELED",
    EXPIRED = "EXPIRED",
    UNKNOWN = "UNKNOWN"
}

@Entity("subscriptions")
@Index(["provider", "purchaseToken"], { unique: true })
@Index(["userId", "provider"])
export class Subscription {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    userId: string;

    @Column({ type: "enum", enum: BillingProvider })
    provider: BillingProvider;

    @Column({ type: "varchar", length: 120 })
    packageName: string;

    @Column({ type: "varchar", length: 120 })
    productId: string;

    @Column({ type: "varchar", length: 2048 })
    purchaseToken: string;

    @Column({ type: "varchar", length: 128, nullable: true })
    orderId: string | null;

    @Column({ type: "enum", enum: SubscriptionStatus, default: SubscriptionStatus.UNKNOWN })
    status: SubscriptionStatus;

    @Column({ type: "timestamp", nullable: true })
    startTime: Date | null;

    @Column({ type: "timestamp", nullable: true })
    expiryTime: Date | null;

    @Column({ type: "boolean", default: false })
    autoRenewing: boolean;

    @Column({ type: "int", nullable: true })
    paymentState: number | null;

    @Column({ type: "int", nullable: true })
    cancelReason: number | null;

    @Column({ type: "int", nullable: true })
    acknowledgementState: number | null;

    @Column({ type: "varchar", length: 8, nullable: true })
    priceCurrencyCode: string | null;

    @Column({ type: "varchar", length: 32, nullable: true })
    priceAmountMicros: string | null;

    @Column({ type: "jsonb", nullable: true })
    rawResponse: Record<string, any> | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
