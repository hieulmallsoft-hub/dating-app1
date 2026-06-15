import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
    ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleAuth } from "google-auth-library";
import { readFile } from "fs/promises";
import {
    BillingProvider,
    Subscription,
    SubscriptionStatus
} from "../domain/entities/subscription.entity";
import { SubscriptionRepository } from "../infrastructure/persistence/subscription.repository";
import { UsersService } from "../../user/application/user.service";
import { GooglePlayVerifyDto } from "../presentation/dto/google-play-verify.dto";

type GooglePlaySubscriptionPurchase = {
    kind?: string;
    regionCode?: string;
    startTime?: string;
    subscriptionState?: string;
    latestOrderId?: string;
    linkedPurchaseToken?: string;
    acknowledgementState?: string;
    lineItems?: GooglePlaySubscriptionLineItem[];
    pausedStateContext?: Record<string, unknown>;
    canceledStateContext?: Record<string, unknown>;
    testPurchase?: Record<string, unknown>;
};

type GooglePlaySubscriptionLineItem = {
    productId?: string;
    expiryTime?: string;
    latestSuccessfulOrderId?: string;
    latest_successful_order_id?: string;
    autoRenewingPlan?: {
        autoRenewEnabled?: boolean;
    };
    prepaidPlan?: Record<string, unknown>;
    offerDetails?: {
        basePlanId?: string;
        offerId?: string;
        offerTags?: string[];
    };
};

type GooglePlayServiceAccount = {
    client_email?: string;
    private_key?: string;
    project_id?: string;
};

const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const GOOGLE_PLAY_ACKNOWLEDGEMENT_PENDING = "ACKNOWLEDGEMENT_STATE_PENDING";
const GOOGLE_PLAY_ACKNOWLEDGEMENT_ACKNOWLEDGED = "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";

@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);
    private googleAuth: GoogleAuth | null = null;
    private cachedServiceAccount: GooglePlayServiceAccount | null | undefined = undefined;

    constructor(
        private readonly configService: ConfigService,
        private readonly subscriptionRepository: SubscriptionRepository,
        private readonly usersService: UsersService
    ) {}

    async verifyGooglePlaySubscription(userId: string, dto: GooglePlayVerifyDto) {
        const purchaseToken = this.normalizeRequired(dto.purchaseToken, "purchaseToken");
        const productId = this.normalizeRequired(dto.productId, "productId");
        this.assertAllowedProductId(productId);
        const packageName = this.resolvePackageName();

        const payload = await this.fetchGooglePlaySubscription(packageName, purchaseToken);
        this.assertVerifiedProduct(payload, productId);
        const record = await this.upsertGooglePlaySubscription(
            userId,
            packageName,
            productId,
            purchaseToken,
            payload
        );

        const isPremium = this.computeIsPremium(record);
        await this.usersService.setPremiumStatus(userId, isPremium);

        if (this.shouldAutoAcknowledge() && this.shouldAcknowledge(payload)) {
            const acknowledged = await this.tryAcknowledgeSubscription(packageName, productId, purchaseToken);
            if (acknowledged) {
                record.acknowledgementState = 1;
                await this.subscriptionRepository.save(record);
            }
        }

        return { subscription: record, isPremium };
    }

    async getGooglePlayStatus(userId: string) {
        const [latest] = await this.subscriptionRepository.find({
            where: { userId, provider: BillingProvider.GOOGLE_PLAY },
            order: { expiryTime: "DESC", updatedAt: "DESC" },
            take: 1
        });

        const isPremium = this.computeIsPremium(latest ?? null);
        await this.usersService.setPremiumStatus(userId, isPremium);

        return { subscription: latest ?? null, isPremium };
    }

    async handleGooglePlayRtdn(payload: unknown) {
        const notification = this.extractRtdnNotification(payload);
        if (!notification?.purchaseToken) {
            this.logger.warn("Google Play RTDN ignored: missing purchase token");
            return { processed: false };
        }

        const existing = await this.subscriptionRepository.findOne({
            where: { provider: BillingProvider.GOOGLE_PLAY, purchaseToken: notification.purchaseToken }
        });

        if (!existing) {
            this.logger.warn("Google Play RTDN ignored: purchase token is not linked to a user");
            return { processed: false };
        }

        const productId = notification.subscriptionId || existing.productId;
        this.assertAllowedProductId(productId);
        const packageName = this.resolvePackageName();
        const googlePayload = await this.fetchGooglePlaySubscription(packageName, notification.purchaseToken);
        this.assertVerifiedProduct(googlePayload, productId);

        const record = await this.upsertGooglePlaySubscription(
            existing.userId,
            packageName,
            productId,
            notification.purchaseToken,
            googlePayload
        );
        const isPremium = await this.refreshUserPremiumStatus(existing.userId);
        return { processed: true, subscription: record, isPremium };
    }

    private computeIsPremium(subscription: Subscription | null) {
        if (!subscription?.expiryTime) return false;
        const hasTimeLeft = subscription.expiryTime.getTime() > Date.now();
        return hasTimeLeft && [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED].includes(subscription.status);
    }

    private resolvePackageName() {
        const configValue = this.configService.get<string>("billing.googlePlay.packageName") || "";
        const candidate = configValue.trim();
        if (!candidate) {
            throw new BadRequestException("Google Play package name is required");
        }
        return candidate;
    }

    private normalizeRequired(value: string | undefined, field: string) {
        const normalized = typeof value === "string" ? value.trim() : "";
        if (!normalized) {
            throw new BadRequestException(`${field} is required`);
        }
        return normalized;
    }

    private assertAllowedProductId(productId: string) {
        const allowedProductIds = this.configService.get<string[]>("billing.googlePlay.productIds") || [];
        if (allowedProductIds.length > 0 && !allowedProductIds.includes(productId)) {
            throw new BadRequestException("Google Play product is not allowed");
        }
    }

    private async fetchGooglePlaySubscription(
        packageName: string,
        purchaseToken: string
    ): Promise<GooglePlaySubscriptionPurchase> {
        const headers = await this.getGoogleAuthHeaders();
        const url = new URL(
            `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
                packageName
            )}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`
        );

        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                ...headers,
                Accept: "application/json"
            }
        });

        const rawBody = await response.text();
        if (!response.ok) {
            const message = this.extractGoogleError(rawBody);
            if (response.status === 401 || response.status === 403) {
                this.logger.warn(`Google Play auth failed: ${message}`);
                throw new ServiceUnavailableException("Google Play credentials are invalid");
            }
            if (response.status === 404) {
                throw new BadRequestException("Subscription not found");
            }
            throw new BadRequestException(`Google Play verification failed: ${message}`);
        }

        try {
            return JSON.parse(rawBody) as GooglePlaySubscriptionPurchase;
        } catch (error) {
            this.logger.warn(`Google Play response parse failed: ${(error as Error)?.message || "unknown"}`);
            throw new InternalServerErrorException("Google Play response parsing failed");
        }
    }

    private assertVerifiedProduct(payload: GooglePlaySubscriptionPurchase, expectedProductId: string) {
        const productIds = this.extractProductIds(payload);
        if (!productIds.includes(expectedProductId)) {
            throw new BadRequestException("Purchase token does not match product");
        }
    }

    private async upsertGooglePlaySubscription(
        userId: string,
        packageName: string,
        productId: string,
        purchaseToken: string,
        payload: GooglePlaySubscriptionPurchase
    ) {
        const existing = await this.subscriptionRepository.findOne({
            where: { provider: BillingProvider.GOOGLE_PLAY, purchaseToken }
        });

        if (existing && existing.userId !== userId) {
            throw new BadRequestException("Purchase token already linked to another account");
        }

        const lineItem = this.resolveLineItem(payload, productId);
        const startTime = this.parseIsoDate(payload.startTime);
        const expiryTime = this.parseIsoDate(lineItem?.expiryTime);
        const status = this.computeStatus(payload, expiryTime);
        const orderId = this.resolveOrderId(payload, lineItem);

        const data: Partial<Subscription> = {
            userId,
            provider: BillingProvider.GOOGLE_PLAY,
            packageName,
            productId,
            purchaseToken,
            orderId,
            status,
            startTime,
            expiryTime,
            autoRenewing: Boolean(lineItem?.autoRenewingPlan?.autoRenewEnabled),
            paymentState: null,
            cancelReason: payload.canceledStateContext ? 1 : null,
            acknowledgementState: this.normalizeAcknowledgementState(payload.acknowledgementState),
            priceCurrencyCode: null,
            priceAmountMicros: null,
            rawResponse: payload ?? null
        };

        if (existing) {
            Object.assign(existing, data);
            return this.subscriptionRepository.save(existing);
        }

        const created = this.subscriptionRepository.create(data);
        return this.subscriptionRepository.save(created);
    }

    private computeStatus(payload: GooglePlaySubscriptionPurchase, expiryTime: Date | null) {
        if (payload.subscriptionState === "SUBSCRIPTION_STATE_PENDING") {
            return SubscriptionStatus.PENDING;
        }
        if (payload.subscriptionState === "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED") {
            return SubscriptionStatus.CANCELED;
        }
        if (payload.subscriptionState === "SUBSCRIPTION_STATE_EXPIRED") {
            return SubscriptionStatus.EXPIRED;
        }
        if (payload.subscriptionState === "SUBSCRIPTION_STATE_CANCELED") {
            return SubscriptionStatus.CANCELED;
        }
        if (
            payload.subscriptionState === "SUBSCRIPTION_STATE_ACTIVE" ||
            payload.subscriptionState === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
        ) {
            return SubscriptionStatus.ACTIVE;
        }
        if (expiryTime && expiryTime.getTime() <= Date.now()) return SubscriptionStatus.EXPIRED;
        return SubscriptionStatus.UNKNOWN;
    }

    private parseIsoDate(value?: string) {
        if (!value) return null;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed;
    }

    private normalizeAcknowledgementState(value?: string) {
        if (value === GOOGLE_PLAY_ACKNOWLEDGEMENT_ACKNOWLEDGED) return 1;
        if (value === GOOGLE_PLAY_ACKNOWLEDGEMENT_PENDING) return 0;
        return null;
    }

    private resolveLineItem(payload: GooglePlaySubscriptionPurchase, productId: string) {
        return payload.lineItems?.find((item) => item.productId === productId) ?? payload.lineItems?.[0] ?? null;
    }

    private extractProductIds(payload: GooglePlaySubscriptionPurchase) {
        return (payload.lineItems ?? [])
            .map((item) => item.productId)
            .filter((item): item is string => Boolean(item));
    }

    private resolveOrderId(
        payload: GooglePlaySubscriptionPurchase,
        lineItem: GooglePlaySubscriptionLineItem | null
    ) {
        return (
            lineItem?.latestSuccessfulOrderId ??
            lineItem?.latest_successful_order_id ??
            payload.latestOrderId ??
            null
        );
    }

    private shouldAcknowledge(payload: GooglePlaySubscriptionPurchase) {
        return payload.acknowledgementState === GOOGLE_PLAY_ACKNOWLEDGEMENT_PENDING;
    }

    private async refreshUserPremiumStatus(userId: string) {
        const subscriptions = await this.subscriptionRepository.find({
            where: { userId, provider: BillingProvider.GOOGLE_PLAY },
            order: { expiryTime: "DESC", updatedAt: "DESC" }
        });
        const isPremium = subscriptions.some((subscription) => this.computeIsPremium(subscription));
        await this.usersService.setPremiumStatus(userId, isPremium);
        return isPremium;
    }

    private extractRtdnNotification(payload: unknown) {
        const body = payload as {
            message?: { data?: string };
            subscriptionNotification?: { purchaseToken?: string; subscriptionId?: string };
        };

        if (body?.subscriptionNotification?.purchaseToken) {
            return body.subscriptionNotification;
        }

        const encoded = body?.message?.data;
        if (!encoded) return null;

        try {
            const decoded = Buffer.from(encoded, "base64").toString("utf8");
            const parsed = JSON.parse(decoded) as {
                subscriptionNotification?: { purchaseToken?: string; subscriptionId?: string };
            };
            return parsed.subscriptionNotification ?? null;
        } catch (error) {
            this.logger.warn(`Google Play RTDN parse failed: ${(error as Error)?.message || "unknown"}`);
            return null;
        }
    }

    private async getGoogleAuthHeaders() {
        try {
            const auth = await this.getGoogleAuthClient();
            const client = await auth.getClient();
            return client.getRequestHeaders();
        } catch (error) {
            this.logger.warn(
                `Google Play auth headers failed: ${(error as Error)?.message || "unknown"}`
            );
            throw new ServiceUnavailableException("Google Play billing is not configured");
        }
    }

    private async getGoogleAuthClient() {
        if (this.googleAuth) {
            return this.googleAuth;
        }

        const credentials = await this.resolveServiceAccount();
        if (!credentials) {
            this.logger.warn(
                "Google Play billing is not configured. Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON or GOOGLE_PLAY_SERVICE_ACCOUNT_FILE."
            );
        }

        this.googleAuth = new GoogleAuth({
            credentials: credentials ?? undefined,
            scopes: [ANDROID_PUBLISHER_SCOPE]
        });

        return this.googleAuth;
    }

    private async resolveServiceAccount(): Promise<GooglePlayServiceAccount | null> {
        if (this.cachedServiceAccount !== undefined) {
            return this.cachedServiceAccount;
        }

        const inlineJson = this.configService.get<string>("billing.googlePlay.serviceAccountJson");
        if (inlineJson) {
            try {
                const parsed = JSON.parse(inlineJson) as GooglePlayServiceAccount;
                const normalized = this.normalizeServiceAccount(parsed);
                if (normalized) {
                    this.cachedServiceAccount = normalized;
                    return normalized;
                }
                this.logger.warn("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing required fields.");
            } catch (error) {
                this.logger.warn(
                    `Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: ${(error as Error)?.message || "unknown"}`
                );
            }
        }

        const filePath = this.configService.get<string>("billing.googlePlay.serviceAccountFile");
        if (filePath) {
            try {
                const raw = await readFile(filePath, "utf8");
                const parsed = JSON.parse(raw) as GooglePlayServiceAccount;
                const normalized = this.normalizeServiceAccount(parsed);
                if (normalized) {
                    this.cachedServiceAccount = normalized;
                    return normalized;
                }
                this.logger.warn("GOOGLE_PLAY_SERVICE_ACCOUNT_FILE is missing required fields.");
            } catch (error) {
                this.logger.warn(
                    `Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_FILE: ${(error as Error)?.message || "unknown"}`
                );
            }
        }

        this.cachedServiceAccount = null;
        return null;
    }

    private normalizeServiceAccount(raw: GooglePlayServiceAccount | null) {
        if (!raw) return null;
        const clientEmail = raw.client_email?.trim();
        const privateKey = this.normalizePrivateKey(raw.private_key);
        const projectId = raw.project_id?.trim();

        if (!clientEmail || !privateKey) return null;
        return {
            client_email: clientEmail,
            private_key: privateKey,
            project_id: projectId
        };
    }

    private normalizePrivateKey(value?: string) {
        if (!value) return "";
        return value
            .trim()
            .replace(/\\\\n/g, "\n")
            .replace(/\\n/g, "\n");
    }

    private extractGoogleError(rawBody: string) {
        if (!rawBody) return "unknown error";
        try {
            const parsed = JSON.parse(rawBody) as { error?: { message?: string } };
            return parsed?.error?.message || rawBody;
        } catch {
            return rawBody;
        }
    }

    private shouldAutoAcknowledge() {
        return Boolean(this.configService.get<boolean>("billing.googlePlay.autoAcknowledge"));
    }

    private async tryAcknowledgeSubscription(
        packageName: string,
        productId: string,
        purchaseToken: string
    ) {
        try {
            await this.acknowledgeSubscription(packageName, productId, purchaseToken);
            return true;
        } catch (error) {
            this.logger.warn(
                `Google Play acknowledge failed: ${(error as Error)?.message || "unknown"}`
            );
            return false;
        }
    }

    private async acknowledgeSubscription(
        packageName: string,
        productId: string,
        purchaseToken: string
    ) {
        const headers = await this.getGoogleAuthHeaders();
        const url = new URL(
            `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
                packageName
            )}/purchases/subscriptions/${encodeURIComponent(
                productId
            )}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`
        );

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const rawBody = await response.text();
            const message = this.extractGoogleError(rawBody);
            throw new Error(message);
        }
    }
}
