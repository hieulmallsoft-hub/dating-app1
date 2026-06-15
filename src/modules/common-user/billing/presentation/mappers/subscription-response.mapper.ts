import {
    BillingProvider,
    Subscription,
    SubscriptionStatus
} from "../../domain/entities/subscription.entity";

export function toSubscriptionStatusResponse(
    subscription: Subscription | null,
    isPremium: boolean
) {
    if (!subscription) {
        return {
            provider: BillingProvider.GOOGLE_PLAY,
            productId: "",
            status: SubscriptionStatus.UNKNOWN,
            isPremium
        };
    }

    return {
        provider: subscription.provider,
        productId: subscription.productId,
        status: subscription.status,
        isPremium,
        orderId: subscription.orderId ?? null,
        packageName: subscription.packageName ?? null,
        startTime: subscription.startTime ? subscription.startTime.toISOString() : null,
        expiryTime: subscription.expiryTime ? subscription.expiryTime.toISOString() : null,
        autoRenewing: subscription.autoRenewing ?? null,
        paymentState: subscription.paymentState ?? null,
        cancelReason: subscription.cancelReason ?? null,
        acknowledgementState: subscription.acknowledgementState ?? null,
        priceCurrencyCode: subscription.priceCurrencyCode ?? null,
        priceAmountMicros: subscription.priceAmountMicros ?? null
    };
}
