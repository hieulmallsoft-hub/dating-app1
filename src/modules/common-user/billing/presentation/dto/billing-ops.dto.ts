import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BillingProvider, SubscriptionStatus } from "../../domain/entities/subscription.entity";

export class SubscriptionStatusResponseDto {
    @ApiProperty({ enum: BillingProvider, example: BillingProvider.GOOGLE_PLAY })
    provider: BillingProvider;

    @ApiProperty({ description: "Subscription product id", example: "premium_monthly" })
    productId: string;

    @ApiProperty({ description: "Billing status", enum: SubscriptionStatus })
    status: SubscriptionStatus;

    @ApiProperty({ description: "Premium entitlement computed from expiry time" })
    isPremium: boolean;

    @ApiPropertyOptional({ description: "Order id from Google Play", example: "GPA.1234-5678-9012-34567" })
    orderId?: string | null;

    @ApiPropertyOptional({ description: "Package name", example: "com.example.app" })
    packageName?: string | null;

    @ApiPropertyOptional({ description: "Start time (ISO-8601)", example: "2026-04-07T12:00:00.000Z" })
    startTime?: string | null;

    @ApiPropertyOptional({ description: "Expiry time (ISO-8601)", example: "2026-05-07T12:00:00.000Z" })
    expiryTime?: string | null;

    @ApiPropertyOptional({ description: "Auto renew flag" })
    autoRenewing?: boolean | null;

    @ApiPropertyOptional({ description: "Payment state from Google Play", example: 1 })
    paymentState?: number | null;

    @ApiPropertyOptional({ description: "Cancel reason from Google Play", example: 1 })
    cancelReason?: number | null;

    @ApiPropertyOptional({ description: "Acknowledgement state from Google Play", example: 1 })
    acknowledgementState?: number | null;

    @ApiPropertyOptional({ description: "Price currency code", example: "USD" })
    priceCurrencyCode?: string | null;

    @ApiPropertyOptional({ description: "Price amount micros", example: "999000" })
    priceAmountMicros?: string | null;
}
